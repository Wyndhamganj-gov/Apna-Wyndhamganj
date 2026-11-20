import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ADMIN_EMAIL, APP_VERSION } from '../types/wdm';

export const APP_IMAGES = {
  heroLandscape: '/src/assets/images/wdm_hero_landscape_1795171066086.jpg',
  waterfall: '/src/assets/images/wdm_waterfall_tourist_1795171058244.jpg',
  festival: '/src/assets/images/wdm_festival_vibe_1795171080538.jpg',
  railway: '/src/assets/images/wdm_news_railway_1795171062211.jpg',
  market: '/src/assets/images/wdm_news_market_1795171058078.jpg',
} as const;

export const HERO_BANNERS = [
  {
    id: 'banner_valley',
    kicker: 'Sonbhadra, Uttar Pradesh',
    title: 'Wyndhamganj Wale',
    subtitle: 'Apna Shahar, Apni Awaaz — Live News, Civic Solutions, Transport & Community.',
    imageUrl: APP_IMAGES.heroLandscape,
    targetModule: 'complaints' as const,
    ctaLabel: 'Open Grievance Portal',
  },
  {
    id: 'banner_tourist',
    kicker: 'Explore Kaimur & Vindhya Belt',
    title: 'Wyndhamganj Tourist',
    subtitle: 'Discover Mukkha Falls, Rihand Dam, sandstone hills, and weekend picnic trails.',
    imageUrl: APP_IMAGES.waterfall,
    targetModule: 'tourist' as const,
    ctaLabel: 'Explore Destinations',
  },
  {
    id: 'banner_festival',
    kicker: 'Community Celebrations',
    title: 'Festival Vibe & Meetups',
    subtitle: 'Puja committee schedules, Influencer Meet 2026 certificates, and local cultural nights.',
    imageUrl: APP_IMAGES.festival,
    targetModule: 'influencer_meet' as const,
    ctaLabel: 'Influencer Meet Pass',
  },
];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function seedCommunityDataIfEmpty(uid: string, userEmail?: string | null): Promise<void> {
  const isAdminUser = userEmail === ADMIN_EMAIL;
  const today = getTodayIso();

  try {
    // 1. Seed News if empty
    const newsSnap = await getDocs(
      query(collection(db, 'news'), where('visibility', '==', 'public'), limit(1))
    );
    if (newsSnap.empty) {
      const batch = writeBatch(db);
      const starterNews = [
        {
          id: 'wdm_news_101',
          articleNumber: 101,
          source: 'Hindustan',
          headline: 'विंढमगंज रोड रेलवे स्टेशन (WDM) पर यात्री शेड व डिजिटल डिस्प्ले का विस्तार शुरू',
          summary:
            'विंढमगंज रोड स्टेशन पर यात्रियों की सुविधा हेतु नए फुट-ओवर ब्रिज, पेयजल बूथ और ट्रेन डिस्प्ले बोर्ड लगाए जा रहे हैं।',
          body: 'विंढमगंज, सोनभद्र: पूर्व मध्य रेलवे के अंतर्गत विंढमगंज रोड (WDM) स्टेशन पर अमृत भारत स्टेशन उन्नयन के तहत प्लेटफॉर्म संख्या 1 व 2 पर यात्री शेड का विस्तार और आधुनिक एलईडी कोच इंडिकेटर लगाए जा रहे हैं। दैनिक यात्रियों व छात्रों ने इस कदम का स्वागत किया है। शक्तिपुंज और त्रिवेणी एक्सप्रेस के ठहराव के समय अब यात्रियों को धूप और बारिश से बड़ी राहत मिलेगी।',
          location: 'Wyndhamganj Road, Sonbhadra',
          imageUrl: APP_IMAGES.railway,
          viewsCount: 8420,
          publishedDate: today,
        },
        {
          id: 'wdm_news_102',
          articleNumber: 102,
          source: 'Prabhat Khabar',
          headline: 'विंढमगंज मुख्य बाजार में साप्ताहिक मंडी के नए रेट जारी, स्थानीय किसानों को मिला बेहतर मूल्य',
          summary:
            'ताजी सब्जियों, धान और सरसों के थोक भाव में स्थिरता से किसानों और ग्राहकों दोनों को राहत मिली है।',
          body: 'विंढमगंज बाजार: स्थानीय साप्ताहिक हाट और सब्जी मंडी में सुबह से ही आसपास के महुली, सलैयाडीह और हरनाकछार के किसान अपनी ताजी फसल लेकर पहुंचे। व्यापार मंडल द्वारा स्वच्छता और पार्किंग व्यवस्था दुरुस्त करने हेतु स्वयंसेवकों की टीम तैनात की गई है, जिससे बाजार रोड पर जाम की समस्या में भारी कमी आई है।',
          location: 'Wyndhamganj Bazar, Sonbhadra',
          imageUrl: APP_IMAGES.market,
          viewsCount: 6150,
          publishedDate: today,
        },
        {
          id: 'wdm_news_103',
          articleNumber: 103,
          source: 'Dainik Jagran',
          headline: 'सोनभद्र पर्यटन कॉरिडोर से जुड़ेंगे विंढमगंज के जलप्रपात और कैमूर व्यू प्वाइंट',
          summary:
            'मुक्खा फॉल और आसपास के प्राकृतिक स्थलों पर सड़क सुदृढ़ीकरण व व्यू डेक निर्माण की कार्ययोजना तैयार।',
          body: 'सोनभद्र जिला पर्यटन विकास समिति की बैठक में विंढमगंज और दुद्धी क्षेत्र के प्राकृतिक झरनों, पहाड़ियों और ऐतिहासिक मंदिरों को इको-टूरिज्म सर्किट से जोड़ने का निर्णय लिया गया है। इससे स्थानीय युवाओं के लिए गाइड, होमस्टे और परिवहन क्षेत्र में रोजगार के नए अवसर खुलेंगे।',
          location: 'Wyndhamganj, Sonbhadra',
          imageUrl: APP_IMAGES.waterfall,
          viewsCount: 5390,
          publishedDate: today,
        },
        {
          id: 'wdm_news_104',
          articleNumber: 104,
          source: 'Local Video',
          headline: 'विंढमगंज इन्फ्लुएंसर मीट 2026: क्षेत्रीय क्रिएटर्स ने दिखाया स्थानीय संस्कृति का डिजिटल मंच',
          summary:
            '50 से अधिक यूट्यूब, इंस्टाग्राम और फेसबुक क्रिएटर्स ने विंढमगंज की धरोहर को देशभर तक पहुंचाने का संकल्प लिया।',
          body: 'विंढमगंज में आयोजित वार्षिक क्रिएटर और इन्फ्लुएंसर मीट में सोनभद्र जिले के उभरते डिजिटल क्रिएटर्स ने हिस्सा लिया। कार्यक्रम में स्थानीय खबरों, पर्यटन, शिक्षा और जन-जागरूकता पर आधारित वीडियो निर्माण को बढ़ावा देने के साथ सभी प्रतिभागियों को डिजिटल प्रमाण-पत्र प्रदान किए गए।',
          location: 'Station Road, Wyndhamganj',
          imageUrl: APP_IMAGES.festival,
          viewsCount: 9240,
          publishedDate: today,
        },
      ];
      for (const item of starterNews) {
        batch.set(doc(db, 'news', item.id), {
          ...item,
          authorId: uid,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // 2. Seed Complaints if empty
    const compSnap = await getDocs(
      query(collection(db, 'complaints'), where('visibility', '==', 'public'), limit(1))
    );
    if (compSnap.empty) {
      const batch = writeBatch(db);
      const starterComplaints = [
        {
          id: 'wdm_comp_01',
          authorName: 'Rajesh Keshari',
          category: 'बिजली समस्या',
          status: 'submitted',
          title: 'स्टेशन रोड व वार्ड 2 में शाम को लगातार लो-वोल्टेज की समस्या',
          location: 'Station Road, Ward 2, Wyndhamganj',
          description:
            'पिछले 5 दिनों से शाम 6 बजे से रात 10 बजे तक वोल्टेज बहुत कम रहता है, जिससे छात्रों की पढ़ाई और दुकानदारों का काम प्रभावित हो रहा है। ट्रांसफार्मर लोड संतुलित करने की आवश्यकता है।',
          supporterCount: isAdminUser ? 34 : 0,
        },
        {
          id: 'wdm_comp_02',
          authorName: 'Sunita Devi',
          category: 'पेयजल समस्या',
          status: 'submitted',
          title: 'महुली मोड़ स्थित सार्वजनिक हैंडपंप की मरम्मत आवश्यक',
          location: 'Mahuli Mod, Wyndhamganj',
          description:
            'मुख्य चौक के पास लगा सरकारी हैंडपंप पिछले सप्ताह से खराब पड़ा है। राहगीरों और आसपास के 40 परिवारों को पीने के पानी के लिए दूर जाना पड़ रहा है।',
          supporterCount: isAdminUser ? 22 : 0,
        },
        {
          id: 'wdm_comp_03',
          authorName: 'Vikash Gupta',
          category: 'सड़क समस्या',
          status: isAdminUser ? 'in_progress' : 'submitted',
          title: 'कोन रोड मोड़ पर जलजमाव से गड्ढे, दोपहिया चालकों को खतरा',
          location: 'Kon Road Crossing, Wyndhamganj',
          description:
            'नाली जाम होने के कारण सड़क पर पानी भर जाता है और गहरे गड्ढे बन गए हैं। कृपया नाली सफाई व पैचवर्क शीघ्र कराया जाए।',
          supporterCount: isAdminUser ? 48 : 0,
        },
        {
          id: 'wdm_comp_04',
          authorName: 'Anil Paswan',
          category: 'सफाई एवं कचरा',
          status: isAdminUser ? 'resolved' : 'submitted',
          title: 'विंढमगंज सब्जी मंडी के पास नियमित कचरा उठाव व डस्टबिन व्यवस्था',
          location: 'Main Bazar Sabzi Mandi, Wyndhamganj',
          description:
            'बाजार समाप्त होने के बाद कचरा उठाव समय पर न होने से दुर्गंध फैलती थी। स्वच्छता टीम ने सुबह 7 बजे नियमित सफाई और दो बड़े कंटेनर लगा दिए हैं।',
          supporterCount: isAdminUser ? 61 : 0,
        },
      ];

      for (const item of starterComplaints) {
        batch.set(doc(db, 'complaints', item.id), {
          ...item,
          authorId: uid,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // 3. Seed Creators if empty (only admin can seed approved+verified, regular users seed pending or wait — we'll render built-in verified creators seamlessly alongside live Firestore creators so the leaderboard is always rich and live!)
    const creatorsSnap = await getDocs(
      query(collection(db, 'creators'), where('visibility', '==', 'public'), limit(1))
    );
    if (creatorsSnap.empty && isAdminUser) {
      const batch = writeBatch(db);
      const starterCreators = [
        {
          id: 'wdm_cr_01',
          name: 'Wyndhamganj Wale Official',
          handle: '@wyndhamganjwale',
          platform: 'YouTube',
          followersCount: 48500,
          category: 'Local News & Culture',
          area: 'Wyndhamganj Bazar',
          profileUrl: 'https://youtube.com',
          verified: true,
          approvalStatus: 'approved',
        },
        {
          id: 'wdm_cr_02',
          name: 'Sonbhadra Explorer',
          handle: '@sonbhadra_explorer',
          platform: 'Instagram',
          followersCount: 31200,
          category: 'Travel & Waterfalls',
          area: 'Station Road (WDM)',
          profileUrl: 'https://instagram.com',
          verified: true,
          approvalStatus: 'approved',
        },
        {
          id: 'wdm_cr_03',
          name: 'Apna Wyndhamganj Live',
          handle: '@apnawyndhamganj',
          platform: 'Facebook',
          followersCount: 27800,
          category: 'Community Updates',
          area: 'Mahuli',
          profileUrl: 'https://facebook.com',
          verified: true,
          approvalStatus: 'approved',
        },
        {
          id: 'wdm_cr_04',
          name: 'Riya Verma Vlogs',
          handle: '@riyavermavlogs',
          platform: 'YouTube',
          followersCount: 19400,
          category: 'Lifestyle & Festivals',
          area: 'Ward 2 — Naya Mohalla',
          profileUrl: 'https://youtube.com',
          verified: true,
          approvalStatus: 'approved',
        },
        {
          id: 'wdm_cr_05',
          name: 'Kaimur Beats Studio',
          handle: '@kaimurbeats',
          platform: 'Instagram',
          followersCount: 14600,
          category: 'Music & Reels',
          area: 'Dudhi Road',
          profileUrl: 'https://instagram.com',
          verified: false,
          approvalStatus: 'approved',
        },
      ];
      for (const cr of starterCreators) {
        batch.set(doc(db, 'creators', cr.id), {
          ...cr,
          ownerId: uid,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // 4. Seed Public Chat Rooms if empty
    const chatsSnap = await getDocs(
      query(collection(db, 'chats'), where('visibility', '==', 'public'), limit(1))
    );
    if (chatsSnap.empty) {
      const batch = writeBatch(db);
      const rooms = [
        {
          id: 'wdm_room_general',
          name: 'Wyndhamganj Chaupal',
          description: 'Daily town discussions, greetings, and civic updates for Wyndhamganj.',
          lastMessage: 'नमस्कार विंढमगंज वालों! आज के ताजा अपडेट यहाँ साझा करें।',
        },
        {
          id: 'wdm_room_travel',
          name: 'WDM Station & Bus Live',
          description: 'Real-time train running status, seat sharing, and Dudhi/Renukoot bus updates.',
          lastMessage: 'Shaktipunj Express platform 1 par time se aa rahi hai.',
        },
        {
          id: 'wdm_room_jobs',
          name: 'Youth, Study & Jobs',
          description: 'Local hiring alerts, exam form help, and skilled labour requests.',
          lastMessage: 'Computer operator vacancy open near Station Road.',
        },
      ];

      for (const room of rooms) {
        batch.set(doc(db, 'chats', room.id), {
          ...room,
          type: 'public',
          participantIds: [],
          visibility: 'public',
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'chats', room.id, 'messages', `welcome_${room.id}`), {
          id: `welcome_${room.id}`,
          roomId: room.id,
          senderId: uid,
          senderName: 'Wyndhamganj Wale Desk',
          senderArea: 'Wyndhamganj Bazar',
          text: room.lastMessage,
          roomVisibility: 'public',
          roomParticipants: [],
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // 5. Seed Listings if empty
    const listingsSnap = await getDocs(
      query(collection(db, 'listings'), where('visibility', '==', 'public'), limit(1))
    );
    if (listingsSnap.empty) {
      const batch = writeBatch(db);
      const starterListings = [
        // Transport
        {
          id: 'wdm_tr_01',
          listingType: 'transport',
          title: '11447 / 11448 Shaktipunj Express',
          subtitle: 'Jabalpur ↔ Howrah via Wyndhamganj Road (WDM)',
          category: 'Train (Daily)',
          location: 'Wyndhamganj Road Station (WDM)',
          timing: '06:12 AM (Towards Howrah) · 09:44 PM (Towards Jabalpur)',
          priceOrRate: 'SL ₹245 / 3A ₹650',
          description: 'Major daily express train connecting Wyndhamganj Road with Singrauli, Chopan, Renukoot, Garhwa Road, Daltonganj, Dhanbad, and Howrah.',
        },
        {
          id: 'wdm_tr_02',
          listingType: 'transport',
          title: '15073 / 15075 Triveni Express',
          subtitle: 'Singrauli / Shaktinagar ↔ Tanakpur via Prayagraj & Lucknow',
          category: 'Train (Express)',
          location: 'Wyndhamganj Road Station (WDM)',
          timing: '05:25 PM (Towards Lucknow) · 07:10 AM (Return)',
          priceOrRate: '2S ₹165 / SL ₹310',
          description: 'Direct overnight rail connection for students and families travelling towards Chopan, Robertsganj, Mirzapur, Prayagraj, and Lucknow.',
        },
        {
          id: 'wdm_tr_03',
          listingType: 'transport',
          title: 'Chopan – Gomoh / Barkakana Passenger',
          subtitle: 'Daily Local Commuter Rail',
          category: 'Train (Passenger)',
          location: 'Wyndhamganj Road Station (WDM)',
          timing: '08:30 AM · 04:15 PM',
          priceOrRate: 'General ₹20–₹45',
          description: 'Affordable daily passenger train stopping at Dudhi Nagar, Muirpur Road, Renukoot, Nagar Untari, and Garhwa.',
        },
        {
          id: 'wdm_tr_04',
          listingType: 'transport',
          title: 'Wyndhamganj – Dudhi – Renukoot – Varanasi Bus',
          subtitle: 'UPSRTC & Private Express Service',
          category: 'Bus Service',
          location: 'Wyndhamganj Bus Stand (Main Chowk)',
          timing: 'Every 45 mins · 05:30 AM to 07:30 PM',
          priceOrRate: 'Dudhi ₹25 · Renukoot ₹60 · Varanasi ₹240',
          description: 'Regular morning and afternoon buses connecting Wyndhamganj Bazar with Dudhi Tehsil, Renukoot, Robertsganj, and Varanasi Cantt.',
        },
        // Shop & Market
        {
          id: 'wdm_sh_01',
          listingType: 'shop',
          title: 'Keshari Agro & Kirana Emporium',
          subtitle: 'Wholesale groceries, pulses, mustard oil & festival essentials',
          category: 'Grocery & Mandi',
          location: 'Main Bazar Road, Wyndhamganj',
          contactPhone: '9450112233',
          priceOrRate: 'Today Rate: Rice ₹36/kg · Mustard Oil ₹142/L',
          timing: '07:00 AM – 09:00 PM',
          description: 'Trusted family-run grocery and daily wholesale supply store with transparent daily mandi rates and home delivery within 3 km.',
          imageUrl: APP_IMAGES.market,
        },
        {
          id: 'wdm_sh_02',
          listingType: 'shop',
          title: 'Sonbhadra Digital & CSC Kendra',
          subtitle: 'Aadhaar print, Train tickets, Income/Caste forms & Banking',
          category: 'Digital & Services',
          location: 'Near Railway Crossing, Station Road',
          contactPhone: '9839445566',
          priceOrRate: 'Online Form ₹50 · Print ₹5/page',
          timing: '09:00 AM – 08:00 PM',
          description: 'Authorized Jan Seva Kendra for scholarship forms, railway e-tickets, passport assistance, and AEPS cash withdrawal.',
        },
        {
          id: 'wdm_sh_03',
          listingType: 'shop',
          title: 'Maa Vindhyavasini Hardware & Solar',
          subtitle: 'Inverters, solar panels, submersible pumps & electricals',
          category: 'Hardware & Solar',
          location: 'Dudhi Road, Wyndhamganj',
          contactPhone: '9415778899',
          priceOrRate: 'Solar Combo from ₹14,500',
          timing: '08:30 AM – 08:00 PM',
          description: 'Complete electrical and solar backup solutions tailored for Wyndhamganj homes and local businesses with on-site installation.',
        },
        // Tourist
        {
          id: 'wdm_to_01',
          listingType: 'tourist',
          title: 'Mukkha Falls & Kaimur Sandstone Valley',
          subtitle: 'Iconic tiered red-sandstone waterfall near Sonbhadra hills',
          category: 'Waterfall & Nature',
          location: 'Sonbhadra Eco-Circuit (Day Trip from WDM)',
          timing: 'Best Season: Aug – Feb · 07:00 AM – 05:30 PM',
          priceOrRate: 'Free Entry',
          description: 'Dramatic layered red-sandstone waterfall surrounded by lush sal forests and misty sunrise views. Ideal for family picnics and photography.',
          imageUrl: APP_IMAGES.waterfall,
        },
        {
          id: 'wdm_to_02',
          listingType: 'tourist',
          title: 'Kanhar Dam & Valley Viewpoint',
          subtitle: 'Scenic reservoir, hills & golden-hour sunset bridge',
          category: 'Dam & Picnic Spot',
          location: 'Dudhi – Amwar Belt, near Wyndhamganj',
          timing: 'Open Daily · Sunrise to Sunset',
          priceOrRate: 'Free Entry',
          description: 'Expansive serene reservoir framed by the Vindhya range. Popular evening drive and weekend getaway for Wyndhamganj residents.',
          imageUrl: APP_IMAGES.heroLandscape,
        },
        // Jobs & Labour
        {
          id: 'wdm_jb_01',
          listingType: 'job',
          title: 'Computer Operator & Billing Assistant',
          subtitle: 'Full-Time · Hindi/English Typing & Tally Prime',
          category: 'Office Job',
          location: 'Station Road, Wyndhamganj',
          contactPhone: '9451223344',
          priceOrRate: '₹10,500 – ₹13,000 / month',
          timing: '10:00 AM – 06:30 PM (Mon–Sat)',
          description: 'Local wholesale agency seeking a punctual computer operator familiar with GST billing, Excel, and customer invoicing.',
        },
        {
          id: 'wdm_jb_02',
          listingType: 'job',
          title: 'Verified Electrician & Inverter Technician',
          subtitle: 'Skilled Local Labour Directory · On-Call Service',
          category: 'Skilled Labour',
          location: 'Wyndhamganj & Mahuli Belt',
          contactPhone: '9794556677',
          priceOrRate: 'Visit ₹150 · Daily Rate ₹650',
          timing: '08:00 AM – 08:00 PM',
          description: 'Experienced house wiring, submersible starter repair, ceiling fan, and solar inverter technician serving all Wyndhamganj wards.',
        },
        // Festival Vibe
        {
          id: 'wdm_fe_01',
          listingType: 'festival',
          title: 'Wyndhamganj Mahotsav & Deepotsav Sandhya',
          subtitle: 'Sarvajanik Puja Samiti · Cultural Folk Night & Lamp Lighting',
          category: 'Cultural Festival',
          location: 'Ramleela Maidan, Wyndhamganj Bazar',
          timing: '06:00 PM onwards · Community Gathering',
          priceOrRate: 'Open for All Citizens',
          description: 'Annual evening celebration uniting local artists, bhajan mandalis, and families with 5,100 earthen diyas and traditional prasad distribution.',
          imageUrl: APP_IMAGES.festival,
        },
        // Events
        {
          id: 'wdm_ev_01',
          listingType: 'event',
          title: 'Wyndhamganj Premier Cricket Cup 2026',
          subtitle: '16-Team Inter-Village Knockout Tournament',
          category: 'Sports Event',
          location: 'Inter College Ground, Wyndhamganj',
          contactPhone: '9621889900',
          timing: 'Starts Sunday · 08:00 AM',
          priceOrRate: 'Team Entry ₹1,100 · Free Spectators',
          description: 'Live commentary, trophy ceremony, and youth talent showcase featuring teams from Wyndhamganj, Mahuli, Dudhi, and Kon.',
        },
        // PG / Room
        {
          id: 'wdm_rm_01',
          listingType: 'room',
          title: 'Shanti Niwas Student PG & Single Rooms',
          subtitle: '24×7 Inverter Backup, RO Water & Bike Parking',
          category: 'Student PG / Room',
          location: '200m from Wyndhamganj Road Station',
          contactPhone: '9936114477',
          priceOrRate: '₹2,200 / month (Single) · ₹3,500 (2-Room Set)',
          timing: 'Immediate Move-In',
          description: 'Clean, airy rooms suited for railway staff, teachers, and coaching students with dedicated study table and peaceful neighborhood.',
        },
        // WhatsApp Groups
        {
          id: 'wdm_wa_01',
          listingType: 'whatsapp',
          title: 'Wyndhamganj Wale — Official Live News',
          subtitle: 'Verified daily local headlines, train alerts & mandi rates',
          category: 'Official Community',
          location: 'Wyndhamganj, Sonbhadra',
          externalUrl: 'https://chat.whatsapp.com/',
          priceOrRate: '1,000+ Active Members',
          description: 'Admin-moderated official announcement group for Wyndhamganj news, power-cut schedules, and emergency notices.',
        },
        {
          id: 'wdm_wa_02',
          listingType: 'whatsapp',
          title: 'Wyndhamganj Jobs, Bazar & Help Desk',
          subtitle: 'Local job openings, room rentals & blood donor alerts',
          category: 'Help & Jobs',
          location: 'Wyndhamganj Block',
          externalUrl: 'https://chat.whatsapp.com/',
          priceOrRate: '640+ Active Members',
          description: 'Community support channel connecting local employers, students, and verified urgent assistance requests.',
        },
        // Helplines
        {
          id: 'wdm_hl_01',
          listingType: 'helpline',
          title: 'Wyndhamganj Police Station / UP-112',
          subtitle: '24×7 Emergency Police Response & Station Desk',
          category: 'Police',
          location: 'Thana Wyndhamganj, Sonbhadra',
          contactPhone: '112',
          timing: '24×7 Emergency',
          description: 'Immediate police assistance, highway patrol, and women safety helpline for Wyndhamganj jurisdiction.',
        },
        {
          id: 'wdm_hl_02',
          listingType: 'helpline',
          title: 'Emergency Ambulance & CHC Medical Help',
          subtitle: 'Free 108 Ambulance & Maternal 102 Service',
          category: 'Hospital & Ambulance',
          location: 'PHC Wyndhamganj / CHC Dudhi',
          contactPhone: '108',
          timing: '24×7 Emergency',
          description: 'Free government emergency ambulance dispatch connecting Wyndhamganj villages with PHC Wyndhamganj and CHC Dudhi.',
        },
        {
          id: 'wdm_hl_03',
          listingType: 'helpline',
          title: 'Electricity Fault & Transformer Helpline',
          subtitle: 'UPPCL 1912 Toll-Free & Sub-Station Desk',
          category: 'Electricity',
          location: 'Wyndhamganj 33/11 KV Sub-Station',
          contactPhone: '1912',
          timing: '24×7 Fault Desk',
          description: 'Report line faults, transformer tripping, and voltage issues across Wyndhamganj feeder lines.',
        },
        {
          id: 'wdm_hl_04',
          listingType: 'helpline',
          title: 'Fire Brigade Emergency',
          subtitle: 'District Fire Station Dispatch',
          category: 'Fire',
          location: 'Sonbhadra Fire Service',
          contactPhone: '101',
          timing: '24×7 Emergency',
          description: 'Rapid fire rescue dispatch for residential, agricultural, and market emergencies.',
        },
        {
          id: 'wdm_hl_05',
          listingType: 'helpline',
          title: 'Dudhi Block & Tehsil Citizen Desk',
          subtitle: 'Revenue, Ration Card & Civic Schemes Info',
          category: 'Block Office',
          location: 'Tehsil Dudhi / Wyndhamganj Block',
          contactPhone: '1076',
          timing: '10:00 AM – 05:00 PM (Mon–Sat)',
          description: 'UP Chief Minister Helpline (1076) and local Block office civic inquiry support for Sonbhadra residents.',
        },
      ];

      for (const item of starterListings) {
        batch.set(doc(db, 'listings', item.id), {
          ...item,
          ownerId: uid,
          visibility: 'public',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    // 6. Seed App Config if admin
    if (isAdminUser) {
      await setDoc(
        doc(db, 'app_config', 'main'),
        {
          id: 'main',
          latestVersion: APP_VERSION,
          releaseNotes:
            'New Wyndhamganj Citizen Card with QR verification, live civic complaint upvoting, and instant WDM Station train schedules.',
          announcement: 'Wyndhamganj Influencer Meet 2026 registrations are now open!',
          officialWhatsAppUrl: 'https://chat.whatsapp.com/',
          visibility: 'public',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    // Non-fatal during initial seed if another client raced or user is non-admin on admin-only docs
    console.warn('Community seed check note:', error);
  }
}

export const FALLBACK_VERIFIED_CREATORS = [
  {
    id: 'builtin_cr_1',
    ownerId: 'system',
    name: 'Wyndhamganj Wale Official',
    handle: '@wyndhamganjwale',
    platform: 'YouTube' as const,
    followersCount: 48500,
    category: 'Local News & Culture',
    area: 'Wyndhamganj Bazar',
    profileUrl: 'https://youtube.com',
    verified: true,
    approvalStatus: 'approved' as const,
    visibility: 'public' as const,
  },
  {
    id: 'builtin_cr_2',
    ownerId: 'system',
    name: 'Sonbhadra Explorer',
    handle: '@sonbhadra_explorer',
    platform: 'Instagram' as const,
    followersCount: 31200,
    category: 'Travel & Waterfalls',
    area: 'Station Road (WDM)',
    profileUrl: 'https://instagram.com',
    verified: true,
    approvalStatus: 'approved' as const,
    visibility: 'public' as const,
  },
  {
    id: 'builtin_cr_3',
    ownerId: 'system',
    name: 'Apna Wyndhamganj Live',
    handle: '@apnawyndhamganj',
    platform: 'Facebook' as const,
    followersCount: 27800,
    category: 'Community Updates',
    area: 'Mahuli',
    profileUrl: 'https://facebook.com',
    verified: true,
    approvalStatus: 'approved' as const,
    visibility: 'public' as const,
  },
  {
    id: 'builtin_cr_4',
    ownerId: 'system',
    name: 'Riya Verma Vlogs',
    handle: '@riyavermavlogs',
    platform: 'YouTube' as const,
    followersCount: 19400,
    category: 'Lifestyle & Festivals',
    area: 'Ward 2 — Naya Mohalla',
    profileUrl: 'https://youtube.com',
    verified: true,
    approvalStatus: 'approved' as const,
    visibility: 'public' as const,
  },
  {
    id: 'builtin_cr_5',
    ownerId: 'system',
    name: 'Kaimur Beats Studio',
    handle: '@kaimurbeats',
    platform: 'Instagram' as const,
    followersCount: 14600,
    category: 'Music & Reels',
    area: 'Dudhi Road',
    profileUrl: 'https://instagram.com',
    verified: false,
    approvalStatus: 'approved' as const,
    visibility: 'public' as const,
  },
];

export async function safeFirestoreCall<T>(
  op: OperationType,
  path: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleFirestoreError(error, op, path);
  }
}
