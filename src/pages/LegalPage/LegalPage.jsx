import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import './LegalPage.css';

const PRIVACY_POLICY = `
# MAXFIYLIK SIYOSATI (Privacy Policy)

## 1. Umumiy qoidalar
Ushbu siyosatning maqsadi va qamrovi 189prep.uz platformasi foydalanuvchilarining shaxsiy ma'lumotlarini himoya qilish tartibini belgilashdir. Foydalanuvchi saytdan foydalanishni boshlash orqali ushbu siyosatga o'z roziligini bildiradi.

## 2. Qanday ma'lumotlarni yig'amiz
- **Shaxsiy ma'lumotlar:** Ism, familiya, telefon raqami, elektron pochta manzili.
- **Texnik ma'lumotlar:** IP manzil, brauzer turi, cookie fayllari, qurilma haqida ma'lumotlar.
- **Moliyaviy ma'lumotlar:** To'lov tizimlari orqali amalga oshirilgan tranzaksiyalar (biz to'lov kartalari ma'lumotlarini to'g'ridan-to'g'ri o'zimizda saqlamaymiz).

## 3. Ma'lumotlardan qanday foydalanamiz
- Xizmatlarni taqdim etish va platformamiz sifatini yaxshilash.
- Foydalanuvchi bilan bog'lanish va savollarga javob berish.
- Yangiliklar, o'zgarishlar va maxsus aksiyalar haqida xabardor qilish.
- Xavfsizlikni ta'minlash va firibgarlikning oldini olish.

## 4. Ma'lumotlarni uchinchi shaxslarga berish
Ma'lumotlar uchinchi shaxslarga faqat qonunchilik talablari asosida yoki xizmat ko'rsatish maqsadida (masalan, to'lov tizimlari, yetkazib berish xizmatlari) taqdim etilishi mumkin. Boshqa holatlarda ma'lumotlar sir saqlanadi.

## 5. Ma'lumotlarni himoya qilish
Ma'lumotlarni xavfsiz saqlash bo'yicha tegishli xavfsizlik choralari ko'riladi, jumladan shifrlash va xavfsiz serverlardan foydalanish.

## 6. Foydalanuvchi huquqlari
Foydalanuvchi o'z ma'lumotlarini ko'rish, o'zgartirish yoki o'chirishni talab qilish huquqiga ega. Shuningdek, xabarnomalardan voz kechish huquqi mavjud.

## 7. O'zgartirishlar kiritish
Siyosatga o'zgartirishlar kiritish tartibi huquqi kompaniyada saqlanib qoladi va bu haqida foydalanuvchilarni sayt orqali xabardor qilamiz.

## 8. Aloqa uchun ma'lumotlar
Savol va murojaatlar uchun:
- Telefon: +998 77 224 31 41
- Telegram: @maxmuraliyev
`;

const TERMS_OF_USE = `
# FOYDALANISH SHARTLARI (Terms of Use)

## 1. Umumiy qoidalar
Ushbu shartlarning maqsadi platformamizdan foydalanish qoidalarini belgilashdir. Sayt/ilovadan foydalanishni boshlash orqali ushbu shartlarga rozi bo'lasiz.

## 2. Saytdan foydalanish qoidalari
- Ruxsat etilgan va taqiqlangan harakatlarga amal qilish talab etiladi.
- Foydalanuvchi ro'yxatdan o'tishda o'z ma'lumotlarini to'g'ri kiritishi va akkaunt xavfsizligini ta'minlashi shart.
- Boshqa foydalanuvchilarni haqorat qilmaslik va qonunga xilof harakatlar qilmaslik talab etiladi.

## 3. Intellektual mulk huquqlari
Saytdagi barcha materiallar (matn, testlar, rasm, logotip, dizayn) kompaniyaga tegishli. Ulardan ruxsatsiz nusxa ko'chirish va tarqatish qat'iyan taqiqlanadi.

## 4. Foydalanuvchi tomonidan yaratilgan kontent
Foydalanuvchi qoldirgan izohlar va fayllar uchun javobgarlik uning o'zida qoladi. Kompaniya bu kontentni o'chirish yoki tahrirlash huquqiga ega.

## 5. Javobgarlikni cheklash
Sayt ishlashidagi qisqa muddatli texnik uzilishlar uchun kompaniya javobgar emas. Foydalanuvchining ehtiyotsizligi oqibatida kelib chiqqan zararlar uchun javobgarlik rad etiladi.

## 6. Uchinchi shaxslar resurslariga havolalar
Saytdagi boshqa veb-saytlarga havolalar uchun kompaniya javobgarlikni o'z zimmasiga olmaydi.

## 7. Shartnomani bekor qilish yoki akkauntni bloklash
Qoidalarni buzgan foydalanuvchilarning akkauntini ogohlantirishsiz yopish yoki bloklash huquqi kompaniyada saqlanib qoladi.

## 8. O'zgartirishlar kiritish
Shartlarga o'zgartirish kiritilishi mumkin va ular e'lon qilingan vaqtdan kuchga kiradi.
`;

const PUBLIC_OFFER = `
# OMMAVIY OFERTA SHARTNOMASI (Public Offer Agreement)

## 1. Atamalar va ta'riflar
- **Sotuvchi:** 189prep.uz xizmatlarini taqdim etuvchi kompaniya.
- **Xaridor:** Xizmatlardan foydalanuvchi va to'lovni amalga oshiruvchi shaxs.
- **Tovar/Xizmat:** Platformadagi pullik ta'lim xizmatlari va testlar.
- **Sayt:** 189prep.uz domenidagi veb-sayt.

## 2. Shartnoma predmeti
Sotuvchi ta'lim xizmatlarini taqdim etadi, Xaridor esa ushbu xizmatlarni qabul qilib to'lovni amalga oshiradi.

## 3. Buyurtmani rasmiylashtirish tartibi
Xaridor sayt orqali o'ziga kerakli xizmat (ta'rif)ni tanlab, to'lov sahifasiga o'tadi va jarayonni tasdiqlaydi.

## 4. Narxlar va to'lov tartibi
- Xizmatlarning narxlari saytda ochiq e'lon qilinadi.
- To'lov usullari: Click, Payme kabi elektron to'lov tizimlari orqali amalga oshiriladi.
- Xizmat to'lov tasdiqlanganidan so'ng darhol faollashadi.

## 5. Xizmat ko'rsatish tartibi
Xizmatlar onlayn tarzda taqdim etiladi. Tizim avtomatik ravishda xaridorga xizmatni yetkazib beradi.

## 6. Qaytarish shartlari
Sotib olingan raqamli xizmatlar (testlar, oylik obunalar) bo'yicha to'langan pullar O'zbekiston Respublikasi qonunchiligida belgilangan maxsus holatlardan tashqari qaytarilmaydi.

## 7. Tomonlarning huquq va majburiyatlari
- **Sotuvchi:** Sifatli xizmat ko'rsatish va shaxsiy ma'lumotlarni sir saqlash majburiyatiga ega.
- **Xaridor:** O'z haqida to'g'ri ma'lumot kiritish va to'lovni vaqtida amalga oshirish majburiyatiga ega.

## 8. Tomonlarning javobgarligi
Shartnoma shartlarini bajarmaslik holatlaridagi javobgarliklar amaldagi qonunchilikka asosan belgilanadi.

## 9. Fors-major holatlar
Yengib bo'lmas kuchlar (tabiiy ofatlar, urush, qonunchilikdagi o'zgarishlar) oqibatida majburiyatlarni bajarmaslik holatlarida tomonlar javobgarlikdan ozod qilinadi.

## 10. Nizolarni hal qilish tartibi
Nizolar birinchi navbatda muzokaralar yo'li bilan hal etiladi. Kelishuvga erishilmasa, O'zbekiston Respublikasi sudlarida ko'rib chiqiladi.

## 11. Shartnomaning amal qilish muddati
Oferta saytda e'lon qilingan vaqtdan e'tiboran kuchga kiradi va xaridor tomonidan to'lov amalga oshirilgan paytdan boshlab bajarilgan hisoblanadi.
`;

const CONTENT_MAP = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_USE,
  offer: PUBLIC_OFFER
};

import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

export default function LegalPage({ type: typeProp, onBack }) {
  const { type: typeParam } = useParams();
  const type = typeProp || typeParam;
  const content = CONTENT_MAP[type] || PRIVACY_POLICY;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <div className="container">
          <button className="legal-back-btn" onClick={onBack}>
            <ArrowLeft size={20} /> Ortga qaytish
          </button>
        </div>
      </div>
      <div className="legal-content">
        <div className="container legal-text-wrapper">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
