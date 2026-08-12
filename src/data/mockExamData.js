export const SUBJECTS = [
  {
    id: 'uzbek',
    name: "O'zbek tili va adabiyoti",
    shortName: "O'zbek tili",
    badge: "Milliy Sertifikat • C1 daraja",
    maxBall: 189,
    questionCount: 30,
    durationMinutes: 45,
    icon: "BookOpen",
    gradient: "from-blue-600 to-indigo-700",
    accentColor: "#1E3A8A",
    description: "Matnni tushunish, mantiqiy tahlil, imlo qoidalari va badiiy san'atlar bo'yicha rasмий Milliy Sertifikat standarti.",
    topics: ["Imlo va uslubiyat", "Matniy mantiq", "Badiiy tahlil", "Grammatik sintaksis"]
  },
  {
    id: 'math',
    name: "Matematika",
    shortName: "Matematika",
    badge: "DTM • Majburiy va Asosiy",
    maxBall: 189,
    questionCount: 30,
    durationMinutes: 60,
    icon: "Calculator",
    gradient: "from-emerald-600 to-teal-700",
    accentColor: "#059669",
    description: "Funksiyalar, hosila va integral, fazoviy geometriya, hamda mantiqiy-matematik masalalar.",
    topics: ["Algebraik ifodalar", "Funksiyalar tahlili", "Planimetriya va Sterometriya", "Ehtimollar nazariyasi"]
  },
  {
    id: 'history',
    name: "O'zbekiston va Jahon Tarixi",
    shortName: "Tarix",
    badge: "DTM 189 Ball Standarti",
    maxBall: 189,
    questionCount: 30,
    durationMinutes: 40,
    icon: "Globe",
    gradient: "from-amber-600 to-orange-700",
    accentColor: "#D97706",
    description: "Qadimgi davlatlar, Temuriylar saltanati, xronologik xaritalar va tarixiy manbalar tahlili.",
    topics: ["Qadimgi va O'rta asrlar", "Temuriylar renesansi", "Yangi va Eng yangi tarix", "Tarixiy manbashunoslik"]
  },
  {
    id: 'english',
    name: "Ingliz tili(CEFR B2-C1)",
    shortName: "Ingliz tili",
    badge: "Milliy Sertifikat & DTM",
    maxBall: 189,
    questionCount: 30,
    durationMinutes: 50,
    icon: "Award",
    gradient: "from-purple-600 to-indigo-800",
    accentColor: "#7C3AED",
    description: "Academic Reading Comprehension, Advanced Vocabulary in Context, Grammar Structure & Phrasal Idioms.",
    topics: ["Reading Comprehension", "Vocabulary & Collocations", "Grammar & Syntax", "Critical Inference"]
  }
];

export const MOCK_QUESTIONS = {
  uzbek: [
    {
      id: 1,
      topic: "Matniy mantiq",
      passageTitle: "MATN 1: Alisher Navoiy va xattotlik san'ati",
      passage: "Temuriylar davrida xattotlik va kitobbat san'ati yuksak taraqqiyot bosqichiga ko'tarildi. Alisher Navoiy o'zining 'Majolis un-nafois' asarida Sultonali Mashhadiy va boshqa mashhur xattotlarning mahoratiga alohida to'xtalib o'tadi. Xattot nafaqat matnni chiroyli ko'chirish, balki asarning ichki ruhini va ohangini harflar uyg'unligi orqali ifoda etishi shart edi. Badiiy qo'lyozmalar maxsus zarhallangan Islimiy naqshlar bilan bezatilgan.",
      question: "Matnga asoslanib, Temuriylar davrida xattotlik san'atiga qo'yilgan eng asosiy badiiy talabni aniqlang:",
      options: [
        { key: "A", text: "Faqatgina harflarni geometrik jihatdan bir xil o'lchamda va tez yozish" },
        { key: "B", text: "Asarning ichki ruhi va ohangini harflar uyg'unligi orqali to'g'ri va go'zal ifodalash" },
        { key: "C", text: "Matnni faqat arabiy xattotlik uslubidan chetlashib, yevropacha shaklda bezash" },
        { key: "D", text: "Kitobning har bir sahifasini faqat zarhal rasm va miniatyuralar bilan to'ldirish" }
      ],
      correct: "B",
      points: 6.3,
      explanation: "Matnning 3-jumlasi aniq ko'rsatadi: 'Xattot nafaqat matnni chiroyli ko'chirish, balki asarning ichki ruhini va ohangini harflar uyg'unligi orqali ifoda etishi shart edi'."
    },
    {
      id: 2,
      topic: "Imlo va uslubiyat",
      passageTitle: "MATN 1: Alisher Navoiy va xattotlik san'ati",
      passage: "Temuriylar davrida xattotlik va kitobbat san'ati yuksak taraqqiyot bosqichiga ko'tarildi. Alisher Navoiy o'zining 'Majolis un-nafois' asarida Sultonali Mashhadiy va boshqa mashhur xattotlarning mahoratiga alohida to'xtalib o'tadi. Xattot nafaqat matnni chiroyli ko'chirish, balki asarning ichki ruhini va ohangini harflar uyg'unligi orqali ifoda etishi shart edi. Badiiy qo'lyozmalar maxsus zarhallangan Islimiy naqshlar bilan bezatilgan.",
      question: "Qaysi qatorda berilgan so'zlarda qo'sh undoshlar imlosiga oid qoida to'g'ri qo'llanilgan?",
      options: [
        { key: "A", text: "taraqqiyot, xattotlik, miniatyura" },
        { key: "B", text: "taraqiyot, xatotlik, minniatyura" },
        { key: "C", text: "taraqqiyod, xattootlik, minatyura" },
        { key: "D", text: "taraqiyyot, xattatlik, minniyatyura" }
      ],
      correct: "A",
      points: 6.3,
      explanation: "'Taraqqiyot' (qq undoshi va iy so'zi) hamda 'xattotlik' (tt undoshi) o'zbek tili rasmiy imlo lug'atiga ko'ra qo'sh undosh bilan yoziladi."
    },
    {
      id: 3,
      topic: "Badiiy tahlil",
      passageTitle: "MATN 2: Mumtoz adabiyotdagi Islimiy timsollar",
      passage: "Sharq mumtoz she'riyatida naqsh va so'z san'ati o'zaro tutashadi. Islimiy naqshlarning cheksiz takrorlanmas halqalari tasavvufdagi poyonsiz intilish va ruhiy takomilni bildiradi. Shoirlar ko'pincha bu naqshni yorning zulfi yoki hayot yo'llarining murakkab silsilasi bilan qiyoslaydilar.",
      question: "Matnda Islimiy naqsh halqalarining cheksizligi qaysi falsafiy ma'no bilan bog'langan?",
      options: [
        { key: "A", text: "Moddiy boylik orttirishning poyonsiz intilishi bilan" },
        { key: "B", text: "Tasavvufdagi ruhiy takomil va cheksiz izlanish bilan" },
        { key: "C", text: "Faqat me'moriy binolarni mustahkamlash texnikasi bilan" },
        { key: "D", text: "Tabiatdagi mavsumiy o'zgarishlar tezligi bilan" }
      ],
      correct: "B",
      points: 6.3,
      explanation: "Matnning 2-jumlasida keltirilgan: 'Islimiy naqshlarning cheksiz takrorlanmas halqalari tasavvufdagi poyonsiz intilish va ruhiy takomilni bildiradi'."
    },
    {
      id: 4,
      topic: "Grammatik sintaksis",
      passageTitle: "MATN 2: Mumtoz adabiyotdagi Islimiy timsollar",
      passage: "Sharq mumtoz she'riyatida naqsh va so'z san'ati o'zaro tutashadi. Islimiy naqshlarning cheksiz takrorlanmas halqalari tasavvufdagi poyonsiz intilish va ruhiy takomilni bildiradi. Shoirlar ko'pincha bu naqshni yorning zulfi yoki hayot yo'llarining murakkab silsilasi bilan qiyoslaydilar.",
      question: "Uchinchi jumlada ('Shoirlar ko'pincha bu naqshni...') qatnashgan 'ko'pincha' so'zi gapda qanday bo'lak vazifasini bajarmoqda?",
      options: [
        { key: "A", text: "Payt holi" },
        { key: "B", text: "Miqdor-daraja holi" },
        { key: "C", text: "Aniqlovchi" },
        { key: "D", text: "To'ldiruvchi" }
      ],
      correct: "A",
      points: 6.3,
      explanation: "'Ko'pincha' ravishi ish-harakatning bajariish paytini (qachon? ko'p vaqtlarda) bildiradi va gapda payt holi bo'lib keladi."
    },
    {
      id: 5,
      topic: "Matniy mantiq",
      passageTitle: "MATN 3: Ilm-fan va axborot asri mas'uliyati",
      passage: "Zamonaviy raqamli davrda ma'lumot olish tezlashgani bilan, chinakam tahliliy tafakkurni shakllantirish yanada muhim ahamiyat kasb etmoqda. Oddiy ma'lumot yodlash emas, balki manbalarning ishonchliligi, mantiqiy zanjiri va amaliy foydasini baholash qobiliyati haqiqiy bilimning mezonidir.",
      question: "Muallif fikriga ko'ra, zamonaviy axborot asrida haqiqiy bilimning mezoni nimadan iborat?",
      options: [
        { key: "A", text: "Imkon qadar ko'proq faktlarni mexanik tarzda yodlab olish" },
        { key: "B", text: "Manbalar ishonchliligi, mantiqi va amaliy ahamiyatini tahlil qila olish" },
        { key: "C", text: "Kitob o'qishni butunlay to'xtatib, faqat raqamli videodarslar ko'rish" },
        { key: "D", text: "Barcha xorijiy tillarni grammatikasiz faqat og'zaki o'rganish" }
      ],
      correct: "B",
      points: 6.3,
      explanation: "Matnda oxirgi gapda ochiq aytilgan: 'manbalarning ishonchliligi, mantiqiy zanjiri va amaliy foydasini baholash qobiliyati haqiqiy bilimning mezonidir'."
    }
  ],
  math: [
    {
      id: 1,
      topic: "Algebraik ifodalar",
      passageTitle: "MASALA 1: Ko'phadlar va kvadrat funksiya",
      passage: "Faraz qiling, f(x) = 2x² - 8x + k kvadrat funksiyaning eng kichik qiymati 5 ga teng. Bu funksiyaning grafigi Oy o'qini (0, k) nuqtada kesib o'tadi.",
      question: "k ning son qiymatini toping:",
      options: [
        { key: "A", text: "k = 13" },
        { key: "B", text: "k = 9" },
        { key: "C", text: "k = 11" },
        { key: "D", text: "k = 7" }
      ],
      correct: "A",
      points: 6.3,
      explanation: "Parabola uchi x0 = -b/(2a) = 8/4 = 2. f(2) = 2(4) - 8(2) + k = 8 - 16 + k = k - 8. Shartga ko'ra k - 8 = 5 => k = 13."
    },
    {
      id: 2,
      topic: "Funksiyalar tahlili",
      passageTitle: "MASALA 2: Logarifmik tenglamalar",
      passage: "Quyidagi ifodani hisoblang: log₂ (16) + log₃ (81) - log₅ (125)",
      question: "Ifodaning natijasini ko'rsating:",
      options: [
        { key: "A", text: "5" },
        { key: "B", text: "4" },
        { key: "C", text: "6" },
        { key: "D", text: "3" }
      ],
      correct: "A",
      points: 6.3,
      explanation: "log₂(16) = 4; log₃(81) = 4; log₅(125) = 3. Demak: 4 + 4 - 3 = 5."
    }
  ]
};

export const LEADERBOARD_DATA = [
  {
    rank: 1,
    name: "Sardorbek Qodirov",
    region: "Toshkent shahri",
    school: "Akademik litsey #1",
    score: 189.0,
    maxScore: 189,
    accuracy: 100,
    timeSpent: "34:15",
    badge: "Oltin Islimi • Absolyut 189 Ball",
    avatarColor: "from-amber-500 to-yellow-600"
  },
  {
    rank: 2,
    name: "Dilnoza Raximova",
    region: "Samarqand viloyati",
    school: "Prezident Maktabi",
    score: 185.7,
    maxScore: 189,
    accuracy: 98.2,
    timeSpent: "37:40",
    badge: "Kumush Adras • C1 Daraja",
    avatarColor: "from-blue-600 to-indigo-700"
  },
  {
    rank: 3,
    name: "Javohir Tursunov",
    region: "Farg'ona viloyati",
    school: "Ixtisoslashtirilgan Maktab",
    score: 183.4,
    maxScore: 189,
    accuracy: 97.0,
    timeSpent: "38:10",
    badge: "Bronza • C1 Daraja",
    avatarColor: "from-emerald-600 to-teal-700"
  },
  {
    rank: 4,
    name: "Shahzoda Alimova",
    region: "Buxoro viloyati",
    school: "Qorako'l Xalqaro Maktabi",
    score: 180.8,
    maxScore: 189,
    accuracy: 95.6,
    timeSpent: "39:55",
    badge: "C1 Daraja • Top 1%",
    avatarColor: "from-purple-600 to-pink-600"
  },
  {
    rank: 5,
    name: "Azizbek Ergashev",
    region: "Xorazm viloyati",
    school: "Urganch litseyi",
    score: 178.5,
    maxScore: 189,
    accuracy: 94.4,
    timeSpent: "41:20",
    badge: "C1 Daraja",
    avatarColor: "from-cyan-600 to-blue-700"
  }
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: "Azizbek M.",
    role: "Milliy Sertifikat C1 — 186.5 ball sohibi",
    quote: "189prep platformasidagi matniy mantiq va tahlil savollari rasmiy Milliy Sertifikat imtihoni bilan 100% mos! Har bir savolning batafsil izohi meni imtihonda 189 ballga yaqinlashtirdi.",
    avatar: "AM"
  },
  {
    id: 2,
    name: "Madina K.",
    role: "Talaba • Grant bo'yicha 189 ball",
    quote: "Raqliblar platformasidan farqli ravishda 189prep da interaktiv vaqt nazorati va respublika bo'yicha haqqoniy reyting mavjudligi insonga kuchli motivatsiya beradi.",
    avatar: "MK"
  }
];
