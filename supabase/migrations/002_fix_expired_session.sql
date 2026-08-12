-- Fix: create_exam_session was returning already-expired sessions, causing
-- /api/get-exam-questions to reject them with "Invalid or expired exam session".
-- Added `AND expires_at > now()` so expired sessions are abandoned and a fresh
-- one is created instead of being re-used.

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

    -- Mark any stale in-progress sessions (including expired ones) as abandoned
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
