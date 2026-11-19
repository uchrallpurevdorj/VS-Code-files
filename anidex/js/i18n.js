import { store } from './store.js';

const MN = {
  'nav.home': 'Нүүр', 'nav.search': 'Хайх', 'nav.saved': 'Хадгалсан', 'nav.profile': 'Профайл',
  'home.greeting': 'Сайн байна уу', 'home.recent': 'Саяхан үзсэн', 'home.seeAll': 'Бүгд',
  'home.trending': 'Тренд', 'home.random': 'Санамсаргүй', 'home.shuffle': 'Дахин', 'home.newSeason': 'Шинэ улирал',
  'time.today': 'Өнөөдөр', 'time.yesterday': 'Өчигдөр', 'time.daysAgo': '{n} өдрийн өмнө',
  'common.episodes': '{n} анги', 'common.back': 'Буцах', 'common.close': 'Хаах', 'common.loadMore': 'Цааш үзэх',
  'common.error': 'Холбогдож чадсангүй', 'common.errorText': 'Интернэт холболтоо шалгаад дахин оролдоно уу.',
  'common.retry': 'Дахин оролдох', 'common.tbd': 'Тодорхойгүй',
  'chip.home': 'Нүүр', 'chip.adventure': 'Адал явдал', 'chip.drama': 'Драма', 'chip.horror': 'Аймшигт', 'chip.ecchi': 'Эччи',
  'chip.isekai': 'Исекай', 'chip.crime': 'Гэмт хэрэг', 'chip.zombie': 'Зомби', 'chip.fight': 'Зодоон',
  'chip.fantasy': 'Уран зөгнөлт', 'chip.magic': 'Ид шид',
  'search.title': 'Хайлт', 'search.placeholder': 'Аниме нэрээр хайх…', 'search.recent': 'Сүүлд хайсан', 'search.clear': 'Цэвэрлэх',
  'search.byGenre': 'Төрлөөр хайх', 'search.results': '{n} үр дүн', 'search.notFound': 'Илэрц олдсонгүй',
  'search.notFoundHint': '“{q}” нэрээр аниме олдсонгүй. Өөр нэрээр хайж үзнэ үү.',
  'saved.title': 'Хадгалсан', 'saved.count': '{n} аниме', 'saved.all': 'Бүгд', 'saved.planning': 'Үзэх', 'saved.watched': 'Үзсэн',
  'saved.empty': 'Хадгалсан аниме алга', 'saved.emptyText': 'Дуртай анимегаа хадгалахад энд харагдана.', 'saved.emptyBtn': 'Аниме хайх',
  'saved.added': 'Хадгаллаа', 'saved.removed': 'Хадгалсанаас хаслаа', 'saved.filterEmpty': 'Энэ ангилалд аниме алга',
  'notif.title': 'Мэдэгдэл', 'notif.empty': 'Мэдэгдэл алга байна', 'notif.emptyText': 'Шинэ мэдэгдэл ирэхэд энд харагдана.',
  'notif.v1.title': 'Шинэчлэл', 'notif.v1.body': 'Anidex 1.0 хувилбар гарлаа! Орж аниме мэдээллээ үзээрэй.',
  'profile.title': 'Профайл', 'profile.guest': 'Зочин', 'profile.guestText': 'Нэвтэрч орвол хадгалсан, үзсэн жагсаалтаа бүх төхөөрөмж дээрээ харна.',
  'profile.login': 'AniList-ээр нэвтрэх', 'profile.logout': 'Гарах', 'profile.stats.saved': 'Хадгалсан', 'profile.stats.watched': 'Үзсэн', 'profile.stats.planning': 'Үзэх',
  'profile.appearance': 'Харагдац', 'profile.language': 'Хэл', 'profile.about': 'Anidex-ийн тухай',
  'profile.loginSoon': 'Удахгүй', 'profile.loginSoonText': 'AniList-ээр нэвтрэх боломж удахгүй нэмэгдэнэ. Одоогоор хадгалсан жагсаалт таны утсанд хадгалагдана.',
  'profile.loginFail': 'Нэвтэрч чадсангүй. Дахин оролдоно уу.', 'profile.loginOk': 'Нэвтэрлээ',
  'appearance.dark': 'Харанхуй', 'appearance.darkSub': 'Шөнийн горим, нүдэнд зөөлөн', 'appearance.light': 'Цайвар', 'appearance.lightSub': 'Өдрийн горим',
  'appearance.system': 'Төхөөрөмжийн дагуу', 'appearance.systemSub': 'Утасны тохиргоог дагана',
  'lang.mn': 'Монгол', 'lang.mnSub': 'Mongolian', 'lang.en': 'English', 'lang.enSub': 'Англи хэл',
  'about.desc': 'Аниме мэдээлэл, тренд, шинэ улирлын жагсаалтыг нэг дор үзэх, дуртайгаа хадгалах апп.',
  'about.version': 'Хувилбар', 'about.source': 'Өгөгдлийн эх сурвалж', 'about.developer': 'Хөгжүүлэгч', 'about.legal': 'Эрх зүйн мэдээлэл',
  'about.credit': 'Data by AniList · Постер, зураг нь тухайн эзэмшигчийнх',
  'legal.title': 'Эрх зүйн мэдээлэл',
  'legal.1.t': 'Өгөгдлийн эх сурвалж', 'legal.1.b': 'Аниме-ийн нэр, тайлбар, оноо, огноо зэрэг мэдээллийг AniList-ээс авна. Data by AniList.',
  'legal.2.t': 'Постер, зураг', 'legal.2.b': 'Бүх постер, зураг нь тухайн студи, түгээгчийн өмч. Anidex зөвхөн мэдээлэл өгөх зорилгоор харуулна.',
  'legal.3.t': 'Видео', 'legal.3.b': 'Anidex аниме үзүүлдэггүй, видео байршуулдаггүй. Үзэх газрыг хууль ёсны платформ руу чиглүүлнэ.',
  'legal.4.t': 'Холбоогүй', 'legal.4.b': 'Anidex нь AniList болон аль ч студитэй албан ёсны холбоогүй, тэдний нэрийн өмнөөс ажилладаггүй.',
  'detail.where': 'Хаана үзэх вэ', 'detail.trailer': 'Трэйлер үзэх', 'detail.more': 'Дэлгэрэнгүй', 'detail.less': 'Хураах',
  'detail.studio': 'Студи', 'detail.season': 'Улирал', 'detail.status': 'Төлөв', 'detail.duration': 'Үргэлжлэх хугацаа', 'detail.source': 'Эх сурвалж', 'detail.format': 'Төрөл',
  'detail.nextEp': 'Дараагийн анги', 'detail.similar': 'Төстэй аниме', 'detail.save': 'Хадгалах', 'detail.minutes': '{n} мин',
  'detail.noDesc': 'Тайлбар байхгүй байна.', 'detail.whereTitle': 'Хаана үзэх вэ', 'detail.noLinks': 'Хууль ёсны үзэх холбоос олдсонгүй.',
  'detail.whereNote': 'Холбоосуудыг AniList-ээс авсан. Anidex видео байршуулдаггүй.', 'detail.noTrailer': 'Трэйлер байхгүй',
  'detail.inDays': '{d} өдөр {h} цагийн дараа', 'detail.inHours': '{h} цагийн дараа', 'detail.soon': 'удахгүй',
  'common.offline': 'Интернэт алга · хадгалсан мэдээлэл харуулж байна', 'common.home': 'Нүүр рүү буцах', 'common.retryIn': 'Дахин оролдох · {n}',
  'net.title': 'Интернэт холболт алга', 'net.text': 'Anidex мэдээллээ интернэтээс авдаг. Холболтоо шалгаад дахин оролдоно уу.',
  'net.connecting': 'Холбогдож байна…', 'net.connectingText': 'Холболт сэргэж байна. Түр хүлээнэ үү.',
  'err.server.t': 'Сервер хариулахгүй байна', 'err.server.b': 'Мэдээлэл өгдөг AniList түр саатсан байна. Хэдхэн минутын дараа дахин оролдоно уу.',
  'err.rate.t': 'Түр хүлээнэ үү', 'err.rate.b': 'Хэт олон хүсэлт илгээгдлээ. Хэдэн секундийн дараа автоматаар дахин оролдоно.',
  'err.nf.t': 'Хуудас олдсонгүй', 'err.nf.b': 'Энэ аниме эсвэл хуудас байхгүй байна.',
  'err.gen.t': 'Алдаа гарлаа', 'err.gen.b': 'Ямар нэг зүйл буруу болчихлоо. Дахин оролдоно уу. Үргэлжлээд гарвал аппыг дахин нээгээрэй.',
  'upd.title': 'Шинэ хувилбар бэлэн', 'upd.text': 'Алдаа засвар, сайжруулалт орсон. Шинэчилсний дараа апп автоматаар дахин нээгдэнэ.',
  'upd.now': 'Шинэчлэх', 'upd.later': 'Дараа', 'upd.updating': 'Шинэчилж байна…', 'upd.done': 'Шинэчлэгдлээ · {v}',
  'detail.trailerShort': 'Трэйлер', 'detail.trailerNeedNet': 'Трэйлер · интернэт хэрэгтэй', 'profile.loginNeedNet': 'Нэвтрэхэд интернэт хэрэгтэй',
  'search.needNet': 'Интернэт алга', 'search.needNetText': 'Хайхад интернэт хэрэгтэй. Холбогдсоны дараа дахин хайна уу.',
  'sec.seeAllTitle': 'Бүгд',
};
const EN = {
  'nav.home': 'Home', 'nav.search': 'Search', 'nav.saved': 'Saved', 'nav.profile': 'Profile',
  'home.greeting': 'Hello', 'home.recent': 'Recently viewed', 'home.seeAll': 'See all',
  'home.trending': 'Trending', 'home.random': 'Random', 'home.shuffle': 'Shuffle', 'home.newSeason': 'New season',
  'time.today': 'Today', 'time.yesterday': 'Yesterday', 'time.daysAgo': '{n} days ago',
  'common.episodes': '{n} eps', 'common.back': 'Back', 'common.close': 'Close', 'common.loadMore': 'Load more',
  'common.error': "Couldn't connect", 'common.errorText': 'Check your internet connection and try again.',
  'common.retry': 'Try again', 'common.tbd': 'TBD',
  'chip.home': 'Home', 'chip.adventure': 'Adventure', 'chip.drama': 'Drama', 'chip.horror': 'Horror', 'chip.ecchi': 'Ecchi',
  'chip.isekai': 'Isekai', 'chip.crime': 'Crime', 'chip.zombie': 'Zombie', 'chip.fight': 'Martial arts',
  'chip.fantasy': 'Fantasy', 'chip.magic': 'Magic',
  'search.title': 'Search', 'search.placeholder': 'Search anime…', 'search.recent': 'Recent searches', 'search.clear': 'Clear',
  'search.byGenre': 'Browse by genre', 'search.results': '{n} results', 'search.notFound': 'No results',
  'search.notFoundHint': 'No anime found for “{q}”. Try a different name.',
  'saved.title': 'Saved', 'saved.count': '{n} anime', 'saved.all': 'All', 'saved.planning': 'Plan to watch', 'saved.watched': 'Watched',
  'saved.empty': 'Nothing saved yet', 'saved.emptyText': 'Anime you save will show up here.', 'saved.emptyBtn': 'Find anime',
  'saved.added': 'Saved', 'saved.removed': 'Removed from saved', 'saved.filterEmpty': 'No anime in this list',
  'notif.title': 'Notifications', 'notif.empty': 'No notifications', 'notif.emptyText': 'New notifications will show up here.',
  'notif.v1.title': 'Update', 'notif.v1.body': 'Anidex 1.0 is here! Open it up and explore anime info.',
  'profile.title': 'Profile', 'profile.guest': 'Guest', 'profile.guestText': 'Sign in to keep your saved and watched lists on every device.',
  'profile.login': 'Sign in with AniList', 'profile.logout': 'Sign out', 'profile.stats.saved': 'Saved', 'profile.stats.watched': 'Watched', 'profile.stats.planning': 'Planned',
  'profile.appearance': 'Appearance', 'profile.language': 'Language', 'profile.about': 'About Anidex',
  'profile.loginSoon': 'Coming soon', 'profile.loginSoonText': 'Sign in with AniList is coming soon. For now your saved list stays on this device.',
  'profile.loginFail': "Couldn't sign in. Please try again.", 'profile.loginOk': 'Signed in',
  'appearance.dark': 'Dark', 'appearance.darkSub': 'Night mode, easy on the eyes', 'appearance.light': 'Light', 'appearance.lightSub': 'Day mode',
  'appearance.system': 'Match device', 'appearance.systemSub': 'Follows your phone setting',
  'lang.mn': 'Монгол', 'lang.mnSub': 'Mongolian', 'lang.en': 'English', 'lang.enSub': 'English',
  'about.desc': 'Browse anime info, trends and the new season in one place, and save your favourites.',
  'about.version': 'Version', 'about.source': 'Data source', 'about.developer': 'Developer', 'about.legal': 'Legal information',
  'about.credit': 'Data by AniList · Posters and images belong to their owners',
  'legal.title': 'Legal information',
  'legal.1.t': 'Data source', 'legal.1.b': 'Anime names, descriptions, scores and dates come from AniList. Data by AniList.',
  'legal.2.t': 'Posters and images', 'legal.2.b': 'All posters and images belong to their studios and distributors. Anidex shows them for information only.',
  'legal.3.t': 'Video', 'legal.3.b': 'Anidex does not stream anime or host video. It points you to legal platforms where you can watch.',
  'legal.4.t': 'Not affiliated', 'legal.4.b': 'Anidex is not officially affiliated with AniList or any studio, and does not act on their behalf.',
  'detail.where': 'Where to watch', 'detail.trailer': 'Watch trailer', 'detail.more': 'Read more', 'detail.less': 'Show less',
  'detail.studio': 'Studio', 'detail.season': 'Season', 'detail.status': 'Status', 'detail.duration': 'Duration', 'detail.source': 'Source', 'detail.format': 'Format',
  'detail.nextEp': 'Next episode', 'detail.similar': 'Similar anime', 'detail.save': 'Save', 'detail.minutes': '{n} min',
  'detail.noDesc': 'No description available.', 'detail.whereTitle': 'Where to watch', 'detail.noLinks': 'No legal streaming links found.',
  'detail.whereNote': 'Links come from AniList. Anidex does not host video.', 'detail.noTrailer': 'No trailer',
  'detail.inDays': 'in {d}d {h}h', 'detail.inHours': 'in {h}h', 'detail.soon': 'soon',
  'common.offline': 'Offline · showing saved info', 'common.home': 'Back to home', 'common.retryIn': 'Try again · {n}',
  'net.title': 'No internet connection', 'net.text': 'Anidex loads its info from the internet. Check your connection and try again.',
  'net.connecting': 'Connecting…', 'net.connectingText': 'Reconnecting. Please wait.',
  'err.server.t': 'Server is not responding', 'err.server.b': 'AniList, where the info comes from, is having a moment. Try again in a few minutes.',
  'err.rate.t': 'Please wait', 'err.rate.b': 'Too many requests were sent. Retrying automatically in a few seconds.',
  'err.nf.t': 'Page not found', 'err.nf.b': 'This anime or page does not exist.',
  'err.gen.t': 'Something went wrong', 'err.gen.b': 'Something went wrong. Please try again. If it keeps happening, reopen the app.',
  'upd.title': 'New version available', 'upd.text': 'Fixes and improvements are ready. The app reopens automatically after updating.',
  'upd.now': 'Update', 'upd.later': 'Later', 'upd.updating': 'Updating…', 'upd.done': 'Updated · {v}',
  'detail.trailerShort': 'Trailer', 'detail.trailerNeedNet': 'Trailer · needs internet', 'profile.loginNeedNet': 'Signing in needs internet',
  'search.needNet': 'You are offline', 'search.needNetText': 'Search needs internet. Try again once you are connected.',
  'sec.seeAllTitle': 'All',
};
const DICT = { mn: MN, en: EN };

export const GENRE_MN = {
  'Action': 'Үйлдэл', 'Adventure': 'Адал явдал', 'Comedy': 'Инээдмийн', 'Drama': 'Драма', 'Ecchi': 'Эччи', 'Fantasy': 'Уран зөгнөлт',
  'Horror': 'Аймшигт', 'Mahou Shoujo': 'Ид шидийн охин', 'Mecha': 'Мека', 'Music': 'Хөгжим', 'Mystery': 'Нууцлаг',
  'Psychological': 'Сэтгэл зүйн', 'Romance': 'Романтик', 'Sci-Fi': 'Шинжлэх ухааны', 'Slice of Life': 'Өдөр тутмын',
  'Sports': 'Спорт', 'Supernatural': 'Ер бусын', 'Thriller': 'Триллер',
};
const FORMAT_MN = { TV: 'ТВ', TV_SHORT: 'Богино ТВ', MOVIE: 'Кино', SPECIAL: 'Тусгай', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Хөгжмийн' };
const FORMAT_EN = { TV: 'TV', TV_SHORT: 'TV short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };
const STATUS_MN = { FINISHED: 'Дууссан', RELEASING: 'Гарч байгаа', NOT_YET_RELEASED: 'Гараагүй', CANCELLED: 'Цуцлагдсан', HIATUS: 'Түр зогссон' };
const STATUS_EN = { FINISHED: 'Finished', RELEASING: 'Airing', NOT_YET_RELEASED: 'Not yet aired', CANCELLED: 'Cancelled', HIATUS: 'On hiatus' };
const SEASON_MN = { WINTER: 'Өвөл', SPRING: 'Хавар', SUMMER: 'Зун', FALL: 'Намар' };
const SEASON_EN = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const SOURCE_MN = { ORIGINAL: 'Эх бүтээл', MANGA: 'Манга', LIGHT_NOVEL: 'Light novel', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Тоглоом', OTHER: 'Бусад', NOVEL: 'Роман', WEB_NOVEL: 'Web novel', ANIME: 'Аниме', COMIC: 'Комик', DOUJINSHI: 'Додзинси', LIVE_ACTION: 'Кино', GAME: 'Тоглоом', MULTIMEDIA_PROJECT: 'Мультимедиа' };
const SOURCE_EN = { ORIGINAL: 'Original', MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Video game', OTHER: 'Other', NOVEL: 'Novel', WEB_NOVEL: 'Web novel', ANIME: 'Anime', COMIC: 'Comic', DOUJINSHI: 'Doujinshi', LIVE_ACTION: 'Live action', GAME: 'Game', MULTIMEDIA_PROJECT: 'Multimedia' };
const pick = (mn, en) => (lang() === 'en' ? en : mn);

export function lang() { return store.settings.lang === 'en' ? 'en' : 'mn'; }
export function t(key, vars) {
  let s = (DICT[lang()][key] ?? DICT.mn[key] ?? key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
export const genreName = g => (lang() === 'mn' ? GENRE_MN[g] || g : g);
export const formatName = f => (f ? pick(FORMAT_MN, FORMAT_EN)[f] || f : '');
export const statusName = s => (s ? pick(STATUS_MN, STATUS_EN)[s] || s : '');
export const seasonName = s => (s ? pick(SEASON_MN, SEASON_EN)[s] || s : '');
export const sourceName = s => (s ? pick(SOURCE_MN, SOURCE_EN)[s] || s.replace(/_/g, ' ') : '');

export function relTime(ts) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(ts); d1.setHours(0, 0, 0, 0);
  const n = Math.round((d0 - d1) / 86400000);
  if (n <= 0) return t('time.today');
  if (n === 1) return t('time.yesterday');
  return t('time.daysAgo', { n });
}

// Home genre chips -> AniList filter
export const CHIPS = [
  { key: 'home' },
  { key: 'adventure', genre: 'Adventure' },
  { key: 'drama', genre: 'Drama' },
  { key: 'horror', genre: 'Horror' },
  { key: 'ecchi', genre: 'Ecchi' },
  { key: 'isekai', tag: 'Isekai' },
  { key: 'crime', tag: 'Crime' },
  { key: 'zombie', tag: 'Zombies' },
  { key: 'fight', tag: 'Martial Arts' },
  { key: 'fantasy', genre: 'Fantasy' },
  { key: 'magic', tag: 'Magic' },
];
