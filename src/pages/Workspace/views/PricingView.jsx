import React from 'react';
import { Check, Shield, Zap, CreditCard } from 'lucide-react';

const getPlans = (isUz) => [
  {
    id: 'plan_free',
    months: 0,
    title: isUz ? 'Bepul Sinov' : 'Бесплатный старт',
    price: 0,
    features: isUz ? [
      "1 ta to'liq Milliy Sertifikat (C1) simulyatsiyasi",
      "Matniy mantiq va o'qish bo'limi namunalari",
      "Umumiy 189 ballik hisoblash tizimi",
      "Respublika reytingida ishtirok etish"
    ] : [
      "1 полная симуляция Национального сертификата (C1)",
      "Примеры заданий по логике текста и чтению",
      "Расчет и прогноз по шкале 189 баллов",
      "Участие в республиканском рейтинге"
    ],
    buttonStyle: 'outline',
    popular: false,
    desc: isUz ? "Platforma imkoniyatlari bilan tanishish uchun ideal start" : "Идеально для знакомства с возможностями платформы"
  },
  {
    id: 'plan_plus',
    months: 1,
    title: 'Plus',
    price: 99000,
    popular: true,
    features: isUz ? [
      "Cheksiz Milliy Sertifikat C1 simulyatsiyalari",
      "Barcha savollar uchun ekspert tahlillari va izohlari",
      "Mavzular bo'yicha maxsus mashq rejimi",
      "AI shaxsiy o'quv rejasi va zaifliklar tahlili",
      "24/7 ustozlar ko'magi"
    ] : [
      "Неограниченные симуляции Национального сертификата C1",
      "Экспертные разборы и объяснения ко всем вопросам",
      "Специальный режим тренировки по темам",
      "ИИ-план обучения и анализ слабых мест",
      "Поддержка наставников 24/7"
    ],
    buttonStyle: 'primary',
    desc: isUz ? "Milliy sertifikatdan A+/A (C1) daraja olishni maqsad qilganlar uchun" : "Для тех, кто нацелен на получение сертификата уровня А+/А (C1)"
  },
  {
    id: 'plan_pro',
    months: 3,
    title: 'Pro',
    price: 199000,
    features: isUz ? [
      "3 oylik barcha fanlar (O'zbek tili, Math, Tarix, Ingliz tili)",
      "Haqiqiy DTM 189 ball to'liq blok testlari",
      "Sertifikat simulyatori + Yozma ish (esse) tahlili",
      "Shaxsiy mentor va haftalik o'sish hisoboti",
      "100% imtiyoz kafolati yo'riqnomasi"
    ] : [
      "Доступ ко всем предметам на 3 месяца (Узбекский, Математика, История, Английский)",
      "Полные блок-тесты ГЦТ на 189 баллов",
      "Симулятор сертификата + проверка эссе",
      "Персональный ментор и еженедельные отчеты",
      "Руководство по 100% поступлению на грант"
    ],
    buttonStyle: 'outline',
    popular: false,
    desc: isUz ? "Abituriyentlar va repetitorlar uchun to'liq imkoniyatlar paketi" : "Полный пакет возможностей для абитуриентов и репетиторов"
  }
];

export default function PricingView({ lang }) {
  const isUz = lang === 'uz';
  const paymentComingSoon = true; // Set to false when real payment credentials are configured
  const plans = getPlans(isUz);

  return (
    <div className="pricing-wrapper fade-in">
      <header className="dashboard-header" style={{ marginBottom: '40px', justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <h1 className="dashboard-title">
            {isUz ? "Ta'riflar va To'lovlar" : 'Тарифы и Оплата'}
          </h1>
          <p className="dashboard-subtitle">
            {isUz ? "O'zingizga mos ta'rifni tanlang va maqsad sari olg'a qadam tashlang" : 'Выберите подходящий тариф и сделайте шаг к цели'}
          </p>
        </div>
      </header>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.popular ? 'recommended' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
            {plan.popular && (
              <div className="recommended-badge">{isUz ? 'TAVSIYA ETILADI' : 'РЕКОМЕНДУЕТСЯ'}</div>
            )}
            
            <div className="pricing-header">
              <h2 className="plan-name">{plan.title}</h2>
              <p className="plan-desc">{plan.desc}</p>
              <div className="plan-price-wrap">
                <span className="plan-price">{plan.price === 0 ? '0' : plan.price.toLocaleString()}</span>
                <span className="plan-period">UZS</span>
              </div>
            </div>

            <div className="pricing-features" style={{ flex: 1 }}>
              {plan.features.map((feature, idx) => (
                <div key={idx} className="feature-item">
                  <Check size={18} className="feature-icon" color="#2563EB" />
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pricing-actions">
              {plan.price === 0 ? (
                <button className="pricing-btn-primary" onClick={() => {}}>
                  {isUz ? 'Bepul Boshlash' : 'Начать бесплатно'}
                </button>
              ) : (
                <>
                  <a href="https://t.me/maxmuraliyev" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
                    <button className="pricing-btn-primary" style={{ width: '100%', cursor: 'pointer', background: '#2563EB' }}>
                      {isUz ? "Telegram orqali to'lov (Admin)" : "Оплата через Telegram (Админ)"}
                    </button>
                  </a>
                  <p style={{ fontSize: '12px', color: 'rgba(15, 23, 42, 0.5)', textAlign: 'center', margin: '8px 0 0 0', fontWeight: '600' }}>
                    {isUz ? "Tugmani bosib, adminga yozing va obunani faollashtiring." : "Нажмите кнопку, напишите админу и активируйте подписку."}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '64px', 
        padding: '32px', 
        background: '#FFFFFF', 
        borderRadius: '24px', 
        border: '1px solid rgba(15, 23, 42, 0.08)', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        maxWidth: '800px',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Shield size={24} color="#2563EB" />
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            {isUz ? 'Xavfsizlik va Kafolat' : 'Безопасность и Гарантия'}
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'rgba(248, 250, 252, 0.8)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: '8px' }}>
              <CreditCard size={20} color="#2563EB" />
            </div>
            <h4 style={{ fontSize: '16px', color: '#0F172A', fontWeight: '700', margin: '0 0 6px 0' }}>
              {isUz ? '100% Xavfsiz To\'lov' : '100% Безопасная Оплата'}
            </h4>
            <p style={{ color: 'rgba(15, 23, 42, 0.6)', fontSize: '14px', lineHeight: '1.5', margin: 0, maxWidth: '600px' }}>
              {isUz ? 'Barcha to\'lovlar rasmiy Payme va Click tizimlari orqali himoyalangan holda amalga oshiriladi.' : 'Все платежи осуществляются через защищенные официальные системы Payme и Click.'}
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'rgba(248, 250, 252, 0.8)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.04)', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: '8px' }}>
              <Zap size={20} color="#2563EB" />
            </div>
            <h4 style={{ fontSize: '16px', color: '#0F172A', fontWeight: '700', margin: '0 0 6px 0' }}>
              {isUz ? 'Tezkor Faollashuv' : 'Мгновенная Активация'}
            </h4>
            <p style={{ color: 'rgba(15, 23, 42, 0.6)', fontSize: '14px', lineHeight: '1.5', margin: 0, maxWidth: '600px' }}>
              {isUz ? 'To\'lovni amalga oshirganingizdan so\'ng darhol barcha premium imkoniyatlar avtomatik faollashadi.' : 'Сразу после оплаты все премиум-функции активируются автоматически.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
