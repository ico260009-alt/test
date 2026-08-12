-- ==============================================================================
-- 189PREP — Complete database schema (fresh project)
-- ==============================================================================
-- Run this once, in order, against a NEW Supabase project (SQL Editor, or
-- `supabase db push` / psql). It creates every table, function, trigger, RLS
-- policy, index, and storage bucket the application code actually references -
-- reconstructed by reading every `.from()`, `.insert()`, `.update()`, `.rpc()`,
-- and `.channel()` call across server.js and src/, since no complete original
-- schema dump exists anywhere in this repository (only an incremental ALTER-style
-- migration written against tables assumed to already exist).
--
-- This has NOT been run against a live database by anyone reviewing this. Run it
-- against a fresh/staging project first, exercise every feature (signup, start
-- exam, submit exam, practice, bookmarks, admin panel, IP blacklist), and adjust
-- anything you know differs from your actual original design intent before
-- treating it as production-ready.
--
-- Security posture baked in throughout (see the audit report for background):
--   - RLS is enabled AND forced on every table - even the service-role key
--     is not a silent bypass unless it's explicitly using supabaseAdmin, which
--     is intentional (server.js uses it deliberately for privileged operations).
--   - mock_tests only exposes rows with is_hidden = false to non-admins (the
--     original policy had no such filter — this is the AUTHZ-002 fix from the
--     audit, applied from the start here).
--   - Regular users cannot write to test_sessions/attempts directly - only via
--     SECURITY DEFINER RPCs or the server's own service-role client - so a
--     client can never fabricate its own score.
--   - is_admin() is SECURITY DEFINER but has EXECUTE revoked from PUBLIC and
--     granted only to `authenticated`, and every admin RLS policy calls it
--     rather than trusting any client-supplied flag.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ==============================================================================
-- 1. PROFILES  (one row per auth.users row, created automatically on signup)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                text,
    full_name            text,
    phone                text,
    avatar_url           text,
    target_university    text,
    target_score         text,
    exam_date            date,
    role                 text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    subscription_tier    text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
    subscription_until   timestamptz,
    is_suspended         boolean NOT NULL DEFAULT false,
    telegram_id          bigint UNIQUE,
    telegram_username    text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row whenever a new auth.users row appears (Telegram signup via
-- supabaseAdmin.auth.admin.createUser() in server.js, or any future signup method).
-- Without this, every new user would have no profiles row and most of the app would break
-- on first load (src/App.jsx fetches profiles by id and never inserts one itself).
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, telegram_id, telegram_username)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NULLIF(NEW.raw_user_meta_data->>'telegram_id', '')::bigint,
        NEW.raw_user_meta_data->>'telegram_username'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. EXAM CONTENT & SESSIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mock_tests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title              text,
    subject            text,
    exam_system        text NOT NULL DEFAULT 'dtm'
                         CHECK (exam_system IN ('dtm', 'milliy_sertifikat', 'sat', 'ielts', 'alevel', 'ap')),
    duration_minutes   integer NOT NULL DEFAULT 180,
    question_count     integer,
    is_premium         boolean NOT NULL DEFAULT false,
    is_hidden          boolean NOT NULL DEFAULT true,  -- hidden (draft) until an admin publishes it
    available_from     timestamptz,
    available_until    timestamptz,
    paper_number       integer,
    essay_topic        text,
    pdf_url            text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id               uuid REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    order_num             integer,
    text                  text NOT NULL,
    image_url             text,
    options               jsonb,
    correct_option_index  integer,
    correct_answer_text   text,
    explanation_uz        text,
    explanation_ru        text,
    points                numeric NOT NULL DEFAULT 1,
    topic                 text,
    subtopic              text,
    difficulty            text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_type         text NOT NULL DEFAULT 'mcq'
                            CHECK (question_type IN ('mcq', 'written', 'essay', 'multipart_ab', 'matching')),
    status                text NOT NULL DEFAULT 'pending_review'
                            CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected')),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id        uuid REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    status         text NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    session_type   text NOT NULL DEFAULT 'exam' CHECK (session_type IN ('exam', 'practice')),
    score          numeric,
    started_at     timestamptz NOT NULL DEFAULT now(),
    completed_at   timestamptz,
    expires_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_questions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
    question_id     uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    is_answered     boolean NOT NULL DEFAULT false,
    attempt_count   integer NOT NULL DEFAULT 0,
    answered_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.attempts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id         uuid REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    question_id     uuid REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer     text,
    is_correct      boolean NOT NULL DEFAULT false,
    points_earned   numeric NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id   uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_integrity_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id      uuid REFERENCES public.mock_tests(id) ON DELETE CASCADE,
    event_type   text NOT NULL,
    details      jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.error_reports (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id      uuid REFERENCES public.mock_tests(id) ON DELETE SET NULL,
    question_id  uuid REFERENCES public.questions(id) ON DELETE SET NULL,
    user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    message      text NOT NULL,
    status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. BILLING & NOTIFICATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount        numeric NOT NULL,
    plan_months   integer,
    status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         text NOT NULL,
    message       text,
    is_read       boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. SECURITY / ADMIN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ip_blacklist (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address    text NOT NULL UNIQUE,
    reason        text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address    text,
    user_agent    text,
    success       boolean NOT NULL,
    reason        text,   -- e.g. 'invalid_signature', 'expired_auth' - null on success
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name     text NOT NULL,
    operation      text NOT NULL,   -- INSERT / UPDATE / DELETE
    row_id         uuid,
    old_data       jsonb,
    new_data       jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Generic audit trigger - attach to any admin-managed table (mock_tests below; add more
-- with the same `CREATE TRIGGER ... EXECUTE FUNCTION public.log_admin_action()` pattern).
CREATE OR REPLACE FUNCTION public.log_admin_action() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (admin_id, table_name, operation, row_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE((NEW).id, (OLD).id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_mock_tests ON public.mock_tests;
CREATE TRIGGER trg_audit_mock_tests
    AFTER INSERT OR UPDATE OR DELETE ON public.mock_tests
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- ==============================================================================
-- 5. VIEWS
-- ==============================================================================

-- Consumed by src/pages/Workspace/views/MocksView.jsx to show a per-test "X people have
-- taken this" count. security_invoker so it respects the querying user's own RLS rather
-- than the view owner's - it only ever exposes a per-test aggregate count, not any
-- individual user's data, so this is safe to expose broadly.
CREATE OR REPLACE VIEW public.mock_tests_with_unique_users
WITH (security_invoker = true) AS
SELECT test_id, COUNT(DISTINCT user_id) AS unique_users_count
FROM public.test_sessions
WHERE test_id IS NOT NULL
GROUP BY test_id;

-- ==============================================================================
-- 6. ENABLE + FORCE RLS EVERYWHERE
-- ==============================================================================

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.questions             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_questions     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attempts              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks             FORCE ROW LEVEL SECURITY;
ALTER TABLE public.exam_integrity_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs      FORCE ROW LEVEL SECURITY;

-- ==============================================================================
-- 6.5 SCHEMA/TABLE GRANTS
-- ==============================================================================
-- Supabase's own project provisioning normally sets these up automatically (the
-- `anon`/`authenticated`/`service_role` roles get broad table-level grants on `public`
-- by default) - but this migration doesn't rely on that being true of wherever it's run,
-- so it's explicit here. This is NOT a security hole: RLS is enabled AND forced (above)
-- on every one of these tables, so a table-level grant only permits an operation that a
-- row-level policy also allows - policies remain the real gatekeeper, exactly as
-- Supabase's own default setup works.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. is_admin()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN coalesce(v_role = 'admin', false);
END;
$$;
ALTER FUNCTION public.is_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==============================================================================
-- 8. RLS POLICIES
-- ==============================================================================

-- --- profiles ---------------------------------------------------------------
-- No general "users update own profile" policy - by design. Regular users can only
-- change their own display fields via the whitelisted update_my_profile() RPC below,
-- which never lets them touch role/subscription_tier/subscription_until/is_suspended.
CREATE POLICY "Read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);  -- fallback path; handle_new_user() is primary
CREATE POLICY "Admins update profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete profiles" ON public.profiles
    FOR DELETE USING (public.is_admin());

-- --- mock_tests --------------------------------------------------------------
CREATE POLICY "Public read visible mock tests" ON public.mock_tests
    FOR SELECT USING (is_hidden = false OR public.is_admin());
CREATE POLICY "Admins manage tests" ON public.mock_tests
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- questions ----------------------------------------------------------------
CREATE POLICY "Admins manage questions" ON public.questions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users view bookmarked questions" ON public.questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.bookmarks b WHERE b.question_id = id AND b.user_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM public.test_sessions ts
            LEFT JOIN public.session_questions sq ON sq.session_id = ts.id
            WHERE ts.user_id = auth.uid() AND ts.status = 'in_progress'
              AND (ts.test_id = questions.test_id OR sq.question_id = questions.id)
        )
    );

-- --- test_sessions --------------------------------------------------------------
-- Deliberately no user INSERT/UPDATE policy - writes only via SECURITY DEFINER RPCs
-- or the server's service-role client, so a client can never fabricate its own score.
CREATE POLICY "Read own sessions" ON public.test_sessions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage sessions" ON public.test_sessions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- session_questions ------------------------------------------------------------
CREATE POLICY "Read own practice tracking" ON public.session_questions
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()));
CREATE POLICY "Admins manage session_questions" ON public.session_questions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- attempts -----------------------------------------------------------------------
CREATE POLICY "Read own attempts" ON public.attempts
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage attempts" ON public.attempts
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- bookmarks --------------------------------------------------------------------
CREATE POLICY "Manage own bookmarks" ON public.bookmarks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --- exam_integrity_events -----------------------------------------------------------
CREATE POLICY "Insert own integrity events" ON public.exam_integrity_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage integrity events" ON public.exam_integrity_events
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- error_reports --------------------------------------------------------------------
CREATE POLICY "Insert own error reports" ON public.error_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage error reports" ON public.error_reports
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- transactions -------------------------------------------------------------------
CREATE POLICY "Read own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Insert own pending transaction" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins manage transactions" ON public.transactions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- notifications --------------------------------------------------------------------
CREATE POLICY "Read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mark own notifications read" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage notifications" ON public.notifications
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --- ip_blacklist / login_logs / admin_audit_logs (admin-only, no client self-service) ---
CREATE POLICY "Admins manage ip_blacklist" ON public.ip_blacklist
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins read login_logs" ON public.login_logs
    FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins read audit logs" ON public.admin_audit_logs
    FOR SELECT USING (public.is_admin());
-- login_logs / admin_audit_logs are written exclusively via supabaseAdmin (service role,
-- which bypasses RLS entirely) from server.js - intentionally no INSERT policy for any
-- other role, so log entries can't be forged or tampered with by a client.

-- ==============================================================================
-- 9. update_my_profile() — the only way a regular user can edit their own profile
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_full_name text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_target_university text DEFAULT NULL,
    p_target_score text DEFAULT NULL,
    p_exam_date date DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_profile public.profiles;
BEGIN
    IF p_phone IS NOT NULL AND p_phone !~ '^\+?[0-9]{9,15}$' THEN
        RAISE EXCEPTION 'Invalid phone number format';
    END IF;

    UPDATE public.profiles SET
        full_name = COALESCE(p_full_name, full_name),
        phone = COALESCE(p_phone, phone),
        target_university = COALESCE(p_target_university, target_university),
        target_score = COALESCE(p_target_score, target_score),
        exam_date = COALESCE(p_exam_date, exam_date),
        updated_at = now()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    RETURN v_profile;
END;
$$;
ALTER FUNCTION public.update_my_profile(text, text, text, text, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_my_profile(text, text, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text, date) TO authenticated;

-- ==============================================================================
-- 10. EXAM / PRACTICE RPCs
-- ==============================================================================

-- 10.1 create_exam_session(p_test_id) — server.js POST /api/start-exam
-- SECURITY DEFINER: there is deliberately no direct "users insert own session" RLS
-- policy on test_sessions (see the policy comment above) - this function is the only
-- sanctioned way a client creates one, and it still uses auth.uid() internally so it
-- can never create a session for anyone other than the caller.
CREATE OR REPLACE FUNCTION public.create_exam_session(p_test_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_duration integer;
    v_existing uuid;
    v_new_id uuid;
BEGIN
    SELECT duration_minutes INTO v_duration FROM public.mock_tests WHERE id = p_test_id;
    IF v_duration IS NULL THEN
        RAISE EXCEPTION 'Test not found';
    END IF;

    -- Only resume a session that is still within its time limit.
    -- Without the expires_at check, an expired-but-still-in_progress row would be
    -- returned here and then immediately rejected by /api/get-exam-questions, producing
    -- the "Invalid or expired exam session" error on every re-entry.
    SELECT id INTO v_existing FROM public.test_sessions
    WHERE user_id = auth.uid() AND test_id = p_test_id AND status = 'in_progress'
      AND session_type = 'exam' AND expires_at > now();
    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    UPDATE public.test_sessions SET status = 'abandoned'
    WHERE user_id = auth.uid() AND status = 'in_progress' AND session_type = 'exam';

    INSERT INTO public.test_sessions (user_id, test_id, status, session_type, started_at, expires_at)
    VALUES (auth.uid(), p_test_id, 'in_progress', 'exam', now(), now() + (v_duration || ' minutes')::interval)
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
ALTER FUNCTION public.create_exam_session(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_exam_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_exam_session(uuid) TO authenticated;

-- 10.2 get_practice_questions(p_session_id) — never returns answer fields
CREATE OR REPLACE FUNCTION public.get_practice_questions(p_session_id uuid)
RETURNS TABLE (
    id uuid, test_id uuid, order_num integer, text text, image_url text, options jsonb,
    points numeric, topic text, subtopic text, difficulty text, status text, question_type text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.test_sessions ts
        WHERE ts.id = p_session_id AND ts.user_id = auth.uid() AND ts.session_type = 'practice'
    ) THEN
        RAISE EXCEPTION 'Invalid or unauthorized session';
    END IF;

    RETURN QUERY
    SELECT q.id, q.test_id, q.order_num, q.text, q.image_url, q.options,
           q.points, q.topic, q.subtopic, q.difficulty, q.status, q.question_type
    FROM public.questions q
    JOIN public.session_questions sq ON sq.question_id = q.id
    WHERE sq.session_id = p_session_id;
END;
$$;
ALTER FUNCTION public.get_practice_questions(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_practice_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practice_questions(uuid) TO authenticated;

-- 10.3 generate_random_practice_session(p_subject, p_difficulties, p_limit)
CREATE OR REPLACE FUNCTION public.generate_random_practice_session(
    p_subject text, p_difficulties text[], p_limit integer
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_session_id uuid;
BEGIN
    IF p_limit IS NULL OR p_limit <= 0 OR p_limit > 200 THEN
        RAISE EXCEPTION 'Invalid question count requested';
    END IF;

    INSERT INTO public.test_sessions (user_id, status, session_type, started_at)
    VALUES (auth.uid(), 'in_progress', 'practice', now())
    RETURNING id INTO v_session_id;

    INSERT INTO public.session_questions (session_id, question_id)
    SELECT v_session_id, q.id
    FROM public.questions q
    JOIN public.mock_tests mt ON mt.id = q.test_id
    WHERE q.status IN ('approved', 'published')
      AND (p_subject IS NULL OR mt.subject ILIKE '%' || p_subject || '%')
      AND (p_difficulties IS NULL OR array_length(p_difficulties, 1) IS NULL OR q.difficulty = ANY (p_difficulties))
    ORDER BY random()
    LIMIT p_limit;

    IF NOT EXISTS (SELECT 1 FROM public.session_questions WHERE session_id = v_session_id) THEN
        DELETE FROM public.test_sessions WHERE id = v_session_id;
        RAISE EXCEPTION 'No matching questions found';
    END IF;

    RETURN v_session_id;
END;
$$;
ALTER FUNCTION public.generate_random_practice_session(text, text[], integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.generate_random_practice_session(text, text[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_random_practice_session(text, text[], integer) TO authenticated;

-- 10.4 create_practice_session(p_question_ids)
CREATE OR REPLACE FUNCTION public.create_practice_session(p_question_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_session_id uuid;
BEGIN
    IF p_question_ids IS NULL OR array_length(p_question_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'No questions provided';
    END IF;

    INSERT INTO public.test_sessions (user_id, status, session_type, started_at)
    VALUES (auth.uid(), 'in_progress', 'practice', now())
    RETURNING id INTO v_session_id;

    INSERT INTO public.session_questions (session_id, question_id)
    SELECT v_session_id, q.id
    FROM public.questions q
    WHERE q.id = ANY (p_question_ids) AND q.status IN ('approved', 'published')
    ON CONFLICT (session_id, question_id) DO NOTHING;

    RETURN v_session_id;
END;
$$;
ALTER FUNCTION public.create_practice_session(uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_practice_session(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_practice_session(uuid[]) TO authenticated;

-- 10.5 check_practice_answer(p_session_id, p_question_id, p_user_answer) — server.js
-- error handling matches on 'Invalid'/'expired'/'unauthorized' -> 403, 'Maximum attempts'/
-- 'already answered' -> 429, 'not found' -> 404, so those phrases are preserved exactly.
CREATE OR REPLACE FUNCTION public.check_practice_answer(
    p_session_id uuid, p_question_id uuid, p_user_answer text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_max_attempts CONSTANT integer := 3;
    v_sq RECORD;
    v_q RECORD;
    v_is_correct boolean := false;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.test_sessions ts
        WHERE ts.id = p_session_id AND ts.user_id = auth.uid()
          AND ts.session_type = 'practice' AND ts.status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Invalid or expired or unauthorized session';
    END IF;

    SELECT * INTO v_sq FROM public.session_questions
    WHERE session_id = p_session_id AND question_id = p_question_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found in this session';
    END IF;

    IF v_sq.is_answered THEN
        RAISE EXCEPTION 'Question already answered';
    END IF;

    IF v_sq.attempt_count >= v_max_attempts THEN
        RAISE EXCEPTION 'Maximum attempts reached for this question';
    END IF;

    SELECT * INTO v_q FROM public.questions WHERE id = p_question_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    IF v_q.question_type = 'written' THEN
        v_is_correct := lower(trim(p_user_answer)) = ANY (
            SELECT lower(trim(x)) FROM unnest(string_to_array(coalesce(v_q.correct_answer_text, ''), ',')) AS x
        );
    ELSE
        v_is_correct := (p_user_answer ~ '^\d+$') AND (p_user_answer::integer = v_q.correct_option_index);
    END IF;

    UPDATE public.session_questions
    SET attempt_count = attempt_count + 1,
        is_answered = v_is_correct OR (attempt_count + 1 >= v_max_attempts),
        answered_at = CASE WHEN v_is_correct OR (attempt_count + 1 >= v_max_attempts) THEN now() ELSE answered_at END
    WHERE session_id = p_session_id AND question_id = p_question_id;

    INSERT INTO public.attempts (user_id, test_id, question_id, user_answer, is_correct, points_earned)
    VALUES (auth.uid(), v_q.test_id, p_question_id, p_user_answer, v_is_correct, CASE WHEN v_is_correct THEN v_q.points ELSE 0 END);

    RETURN jsonb_build_object(
        'isCorrect', v_is_correct,
        'correctOptionIndex', v_q.correct_option_index,
        'correctAnswer', v_q.correct_answer_text,
        'explanation_uz', v_q.explanation_uz,
        'explanation_ru', v_q.explanation_ru,
        'attemptsLeft', GREATEST(v_max_attempts - (v_sq.attempt_count + 1), 0)
    );
END;
$$;
ALTER FUNCTION public.check_practice_answer(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_practice_answer(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_practice_answer(uuid, uuid, text) TO authenticated;

-- 10.6 get_question_metadata(p_test_ids) — metadata only, no options/answers
CREATE OR REPLACE FUNCTION public.get_question_metadata(p_test_ids uuid[])
RETURNS TABLE (id uuid, test_id uuid, topic text, subtopic text, difficulty text, question_type text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT q.id, q.test_id, q.topic, q.subtopic, q.difficulty, q.question_type
    FROM public.questions q
    WHERE q.test_id = ANY (p_test_ids) AND q.status IN ('approved', 'published');
$$;
ALTER FUNCTION public.get_question_metadata(uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_question_metadata(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_metadata(uuid[]) TO authenticated;

-- ==============================================================================
-- 11. INDEXES
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_exam
    ON public.test_sessions (user_id) WHERE status = 'in_progress' AND session_type = 'exam';

CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id_status ON public.test_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id        ON public.test_sessions (test_id);
CREATE INDEX IF NOT EXISTS idx_questions_test_id_status     ON public.questions (test_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_topic_difficulty   ON public.questions (topic, difficulty) WHERE status IN ('approved', 'published');
CREATE INDEX IF NOT EXISTS idx_sq_session_id                ON public.session_questions (session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id_test_id     ON public.attempts (user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id            ON public.bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_mock_tests_subject           ON public.mock_tests (subject);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id         ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread    ON public.notifications (user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id           ON public.login_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at        ON public.login_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at  ON public.admin_audit_logs (created_at DESC);

-- ==============================================================================
-- 12. STORAGE BUCKETS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-test-pdfs', 'mock-test-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Used by AdminQuestionsManager.jsx for both question images (root of the bucket) and
-- test PDFs (under a 'test-pdfs/' prefix) - a real bucket name, not a naming mismatch.
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete PDFs" ON storage.objects;
CREATE POLICY "Public Read PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'mock-test-pdfs');
CREATE POLICY "Admin Insert PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mock-test-pdfs' AND public.is_admin());
CREATE POLICY "Admin Update PDFs" ON storage.objects FOR UPDATE USING (bucket_id = 'mock-test-pdfs' AND public.is_admin());
CREATE POLICY "Admin Delete PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'mock-test-pdfs' AND public.is_admin());

DROP POLICY IF EXISTS "Public Read Question Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Question Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Question Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Question Images" ON storage.objects;
CREATE POLICY "Public Read Question Images" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');
CREATE POLICY "Admin Insert Question Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question-images' AND public.is_admin());
CREATE POLICY "Admin Update Question Images" ON storage.objects FOR UPDATE USING (bucket_id = 'question-images' AND public.is_admin());
CREATE POLICY "Admin Delete Question Images" ON storage.objects FOR DELETE USING (bucket_id = 'question-images' AND public.is_admin());

DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Manage Own Avatar" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- Expects uploads at "<user_id>/..." within the bucket - only the owning user (by uid
-- prefix) or an admin may write/replace/delete their own avatar.
CREATE POLICY "Users Manage Own Avatar" ON storage.objects FOR ALL
    USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
    WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

COMMIT;

-- ==============================================================================
-- AFTER RUNNING THIS FILE
-- ==============================================================================
-- 1. In Supabase project settings, set your env vars to point at the new project
--    (SUPABASE_URL / VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, VITE_SUPABASE_PUBLISHABLE_KEY).
-- 2. Create your first admin: sign up normally (creates a 'user'-role profile via the
--    trigger), then run:  UPDATE public.profiles SET role = 'admin' WHERE id = '<your-uid>';
-- 3. Re-seed public.mock_tests / public.questions - this file creates structure only.
-- 4. Sanity-check each flow end to end: signup -> profile auto-created, start exam,
--    submit exam, start practice (both modes), check a practice answer, bookmark a
--    question, admin: create/hide a test, ban an IP (then verify it's actually blocked -
--    see lib/ipBlacklist.js), view login_logs (now actually populated).
-- 5. GET /api/health should return 200 with "db": "ok" once env vars point at this project.
