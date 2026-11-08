/**
 * Catálogo musical.
 *
 * - `demo-clasicos`: composiciones de DOMINIO PÚBLICO interpretadas por un sintetizador propio
 *   en el navegador (no se usa ninguna grabación de terceros). Es la edición jugable del prototipo.
 * - `general`: metadatos de canciones comerciales para la Edición General. NO tienen audio:
 *   quedan en estado `pending_license` hasta que se registre un fragmento con derechos autorizados
 *   desde el panel administrativo. El campo `spotifyUrl` es solo una referencia editorial.
 */

/** private_use: canciones subidas por el dueño para jugar en privado. Nunca para vender. */
export type RightsStatus = 'public_domain_composition' | 'licensed' | 'private_use' | 'pending_license';

export interface TrackRights {
  status: RightsStatus;
  holder?: string;
  licenseId?: string;
  territory?: string;
  expiresAt?: string;
  note: string;
}

export type TrackAudio =
  | { kind: 'synth'; bpm: number; notes: [string, number][] }
  | {
      kind: 'file';
      url: string;
      clipStart: number;
      clipDuration: number;
      /** Duración total del archivo (s), para elegir fragmentos al azar */
      durationSec?: number;
      /** fixed: siempre clipStart · hook: desde el estribillo (clipStart) · random: un trozo distinto cada vez */
      clipMode?: 'fixed' | 'hook' | 'random';
    };

export interface TrackDef {
  id: string;
  title: string;
  artist: string;
  titleAliases: string[];
  artistAliases: string[];
  year: number;
  genre: string;
  subgenre?: string;
  country: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  expansion: string;
  explicit: boolean;
  spotifyUrl: string | null;
  audio: TrackAudio | null;
  rights: TrackRights;
  active: boolean;
}

/** Notación compacta: "E4:1 D#4:.5 R:1" (nota:pulsos). R = silencio. */
function m(src: string): [string, number][] {
  return src
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [n, d] = tok.split(':');
      return [n, Number(d)] as [string, number];
    });
}

const PD = (note = 'Composición de dominio público. Interpretación sintetizada original de Beat or Shot.'): TrackRights => ({
  status: 'public_domain_composition',
  holder: 'Dominio público',
  territory: 'Mundial',
  note
});

const TRAD = ['tradicional', 'anonimo', 'popular', 'folclore', 'folklore', 'anonima'];

type Seed = Omit<TrackDef, 'expansion' | 'explicit' | 'spotifyUrl' | 'rights' | 'active' | 'audio'> & {
  bpm: number;
  melody: string;
  rights?: TrackRights;
};

const demoSeeds: Seed[] = [
  { id: 'pd-oda-alegria', title: 'Himno de la alegría', artist: 'Ludwig van Beethoven', titleAliases: ['Oda a la alegría', 'Ode to Joy', 'Novena sinfonía', 'Sinfonía 9', 'Novena', 'Himno a la alegría'], artistAliases: ['Beethoven', 'L. v. Beethoven'], year: 1824, genre: 'Clásica', subgenre: 'Sinfonía', country: 'Alemania', difficulty: 1, bpm: 120,
    melody: 'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2' },
  { id: 'pd-para-elisa', title: 'Para Elisa', artist: 'Ludwig van Beethoven', titleAliases: ['Für Elise', 'Fur Elise', 'Elisa', 'Bagatela para Elisa'], artistAliases: ['Beethoven'], year: 1810, genre: 'Clásica', subgenre: 'Piano', country: 'Alemania', difficulty: 1, bpm: 150,
    melody: 'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 R:.5 C4:.5 E4:.5 A4:.5 B4:1 R:.5 E4:.5 G#4:.5 B4:.5 C5:1 R:.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 R:.5 C4:.5 E4:.5 A4:.5 B4:1 R:.5 E4:.5 C5:.5 B4:.5 A4:2' },
  { id: 'pd-quinta', title: 'Quinta sinfonía', artist: 'Ludwig van Beethoven', titleAliases: ['Sinfonía 5', 'Sinfonía n 5', '5ta sinfonía', 'Sinfonía del destino', 'Fifth Symphony', 'Quinta'], artistAliases: ['Beethoven'], year: 1808, genre: 'Clásica', subgenre: 'Sinfonía', country: 'Alemania', difficulty: 1, bpm: 108,
    melody: 'R:.5 G4:.5 G4:.5 G4:.5 Eb4:3 R:.5 F4:.5 F4:.5 F4:.5 D4:3 R:.5 G4:.5 G4:.5 G4:.5 Eb4:.5 Ab4:.5 Ab4:.5 Ab4:.5 G4:.5 Eb5:.5 Eb5:.5 Eb5:.5 C5:3' },
  { id: 'pd-claro-luna', title: 'Sonata Claro de luna', artist: 'Ludwig van Beethoven', titleAliases: ['Claro de luna', 'Moonlight Sonata', 'Sonata para piano 14', 'Sonata 14'], artistAliases: ['Beethoven'], year: 1801, genre: 'Clásica', subgenre: 'Piano', country: 'Alemania', difficulty: 3, bpm: 56,
    melody: 'G#3:.33 C#4:.33 E4:.34 G#3:.33 C#4:.33 E4:.34 G#3:.33 C#4:.33 E4:.34 G#3:.33 C#4:.33 E4:.34 A3:.33 C#4:.33 E4:.34 A3:.33 C#4:.33 E4:.34 A3:.33 D4:.33 F#4:.34 A3:.33 D4:.33 F#4:.34 G#3:.33 C4:.33 F#4:.34 G#3:.33 C#4:.33 E4:.34 G#3:.33 C#4:.33 D#4:.34 F#3:.33 C4:.33 D#4:.34' },
  { id: 'pd-nachtmusik', title: 'Pequeña serenata nocturna', artist: 'Wolfgang Amadeus Mozart', titleAliases: ['Eine kleine Nachtmusik', 'Serenata nocturna', 'Pequeña música nocturna', 'Serenata 13'], artistAliases: ['Mozart', 'W. A. Mozart', 'Amadeus Mozart'], year: 1787, genre: 'Clásica', subgenre: 'Serenata', country: 'Austria', difficulty: 2, bpm: 132,
    melody: 'G4:1 R:.5 D4:.5 G4:1 R:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1 R:.5 A4:.5 C5:1 R:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2' },
  { id: 'pd-marcha-turca', title: 'Marcha turca', artist: 'Wolfgang Amadeus Mozart', titleAliases: ['Rondo alla turca', 'Rondó alla turca', 'Turkish March', 'Rondo a la turca'], artistAliases: ['Mozart', 'W. A. Mozart'], year: 1783, genre: 'Clásica', subgenre: 'Piano', country: 'Austria', difficulty: 2, bpm: 116,
    melody: 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:2 B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 A4:2' },
  { id: 'pd-rey-montana', title: 'En la gruta del rey de la montaña', artist: 'Edvard Grieg', titleAliases: ['Rey de la montaña', 'In the Hall of the Mountain King', 'La gruta del rey de la montaña', 'Peer Gynt'], artistAliases: ['Grieg'], year: 1875, genre: 'Clásica', subgenre: 'Música incidental', country: 'Noruega', difficulty: 2, bpm: 150,
    melody: 'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:1 D#4:.5 B3:.5 D#4:1 D4:.5 A#3:.5 D4:1 A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:.5 A4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:2 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:1 D#5:.5 B4:.5 D#5:1 D5:.5 A#4:.5 D5:1' },
  { id: 'pd-manana-grieg', title: 'La mañana', artist: 'Edvard Grieg', titleAliases: ['Mañana', 'Morning Mood', 'Morgenstemning', 'La mañana Peer Gynt'], artistAliases: ['Grieg'], year: 1875, genre: 'Clásica', subgenre: 'Música incidental', country: 'Noruega', difficulty: 3, bpm: 104,
    melody: 'G5:1 E5:.5 D5:.5 C5:.5 D5:.5 E5:.5 G5:.5 E5:.5 D5:.5 C5:.5 D5:.5 E5:.5 D5:.5 E5:.5 G5:.5 E5:.5 G5:.5 A5:.5 E5:.5 A5:.5 G5:.5 E5:.5 D5:.5 C5:2' },
  { id: 'pd-danubio', title: 'El Danubio azul', artist: 'Johann Strauss II', titleAliases: ['Danubio azul', 'An der schönen blauen Donau', 'The Blue Danube', 'El bello Danubio azul'], artistAliases: ['Johann Strauss', 'Strauss', 'Johann Strauss hijo'], year: 1866, genre: 'Clásica', subgenre: 'Vals', country: 'Austria', difficulty: 2, bpm: 170,
    melody: 'D4:1 D4:1 F#4:1 A4:1 A4:2 R:1 A5:1 R:1 A5:1 R:1 F#5:1 R:1 F#5:2 R:1 D4:1 D4:1 F#4:1 A4:1 A4:2 R:1 A5:1 R:1 A5:1 R:1 G5:1 R:1 G5:2 R:1 C#4:1 C#4:1 E4:1 B4:1 B4:2 R:1 B5:1 R:1 B5:1 R:1 G5:1 R:1 G5:2' },
  { id: 'pd-canon', title: 'Canon en re mayor', artist: 'Johann Pachelbel', titleAliases: ['Canon', 'Canon de Pachelbel', 'Canon in D', 'Canon en re'], artistAliases: ['Pachelbel'], year: 1680, genre: 'Clásica', subgenre: 'Barroco', country: 'Alemania', difficulty: 2, bpm: 76,
    melody: 'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2' },
  { id: 'pd-primavera', title: 'La primavera', artist: 'Antonio Vivaldi', titleAliases: ['Primavera', 'Las cuatro estaciones', 'Spring', 'La primavera cuatro estaciones'], artistAliases: ['Vivaldi'], year: 1725, genre: 'Clásica', subgenre: 'Barroco', country: 'Italia', difficulty: 3, bpm: 104,
    melody: 'E5:1 G#5:1 G#5:1 G#5:1 F#5:.5 E5:.5 B5:2.5 B5:.5 A5:.5 G#5:1 G#5:1 G#5:1 F#5:.5 E5:.5 B5:2.5 B5:.5 A5:.5 G#5:1 A5:.5 B5:.5 A5:1 G#5:1 F#5:2' },
  { id: 'pd-tocata', title: 'Tocata y fuga en re menor', artist: 'Johann Sebastian Bach', titleAliases: ['Tocata y fuga', 'Toccata and Fugue', 'Tocata en re menor', 'BWV 565'], artistAliases: ['Bach', 'J. S. Bach'], year: 1704, genre: 'Clásica', subgenre: 'Barroco', country: 'Alemania', difficulty: 2, bpm: 60,
    melody: 'A5:.15 G5:.15 A5:1.5 R:.4 G5:.2 F5:.2 E5:.2 D5:.2 C#5:.8 D5:2 R:.5 A4:.15 G4:.15 A4:1.5 R:.4 E4:.4 F4:.4 C#4:.4 D4:2' },
  { id: 'pd-guillermo-tell', title: 'Obertura de Guillermo Tell', artist: 'Gioachino Rossini', titleAliases: ['Guillermo Tell', 'William Tell', 'William Tell Overture', 'Obertura Guillermo Tell'], artistAliases: ['Rossini'], year: 1829, genre: 'Clásica', subgenre: 'Ópera', country: 'Italia', difficulty: 2, bpm: 150,
    melody: 'G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 D5:.5 E5:1 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 E5:.5 D5:.5 B4:.5 G4:1 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 D5:.5 E5:1 C5:.5 E5:.5 G5:2' },
  { id: 'pd-cancan', title: 'Can-can', artist: 'Jacques Offenbach', titleAliases: ['Cancan', 'Can can', 'Galop infernal', 'Orfeo en los infiernos'], artistAliases: ['Offenbach'], year: 1858, genre: 'Clásica', subgenre: 'Opereta', country: 'Francia', difficulty: 1, bpm: 150,
    melody: 'C4:1 D4:.5 F4:.5 E4:.5 D4:.5 G4:1 G4:1 G4:.5 A4:.5 E4:.5 F4:.5 D4:1 D4:1 D4:.5 F4:.5 E4:.5 D4:.5 C4:.5 C5:.5 B4:.5 A4:.5 G4:.5 F4:.5 E4:.5 D4:.5 C4:1' },
  { id: 'pd-nupcial', title: 'Marcha nupcial', artist: 'Richard Wagner', titleAliases: ['Coro nupcial', 'Here Comes the Bride', 'Bridal Chorus', 'Lohengrin', 'Marcha nupcial de Lohengrin'], artistAliases: ['Wagner'], year: 1850, genre: 'Clásica', subgenre: 'Ópera', country: 'Alemania', difficulty: 2, bpm: 84,
    melody: 'C4:1 F4:1.5 F4:.5 F4:2 C4:1 G4:1 E4:1 F4:2 C4:1 F4:1 Bb4:1.5 Bb4:.5 A4:1 G4:1 F4:1.5 E4:.5 F4:1 G4:2' },
  { id: 'pd-habanera', title: 'Habanera', artist: 'Georges Bizet', titleAliases: ['Habanera de Carmen', "L'amour est un oiseau rebelle", 'El amor es un pájaro rebelde', 'Carmen'], artistAliases: ['Bizet'], year: 1875, genre: 'Clásica', subgenre: 'Ópera', country: 'Francia', difficulty: 4, bpm: 96,
    melody: 'D5:1.5 C#5:.5 C5:1 C5:1 B4:.5 Bb4:1 A4:.5 A4:.5 Ab4:.5 G4:1 F4:.5 E4:.5 F4:.5 G4:.5 F4:.5 E4:2' },
  { id: 'pd-toreador', title: 'Canción del toreador', artist: 'Georges Bizet', titleAliases: ['Toreador', 'Toréador', 'Votre toast', 'Marcha del toreador'], artistAliases: ['Bizet'], year: 1875, genre: 'Clásica', subgenre: 'Ópera', country: 'Francia', difficulty: 3, bpm: 104,
    melody: 'C5:1 D5:.75 C5:.25 A4:1 A4:1 A4:.75 G4:.25 A4:.75 Bb4:.25 A4:2 Bb4:1 G4:.75 C5:.25 A4:2 F4:1 D4:.75 G4:.25 C4:2' },
  { id: 'pd-entertainer', title: 'The Entertainer', artist: 'Scott Joplin', titleAliases: ['El animador', 'Entertainer', 'El golpe'], artistAliases: ['Joplin'], year: 1902, genre: 'Ragtime', subgenre: 'Piano', country: 'Estados Unidos', difficulty: 2, bpm: 92,
    melody: 'D4:.5 D#4:.5 E4:.5 C5:1 E4:.5 C5:1 E4:.5 C5:2.5 C5:.5 D5:.5 D#5:.5 E5:.5 C5:.5 D5:.5 E5:1 B4:.5 D5:1 C5:2' },
  { id: 'pd-funebre', title: 'Marcha fúnebre', artist: 'Frédéric Chopin', titleAliases: ['Marcha funebre', 'Funeral March', 'Sonata 2', 'Marcha fúnebre de Chopin'], artistAliases: ['Chopin'], year: 1839, genre: 'Clásica', subgenre: 'Piano', country: 'Polonia', difficulty: 2, bpm: 60,
    melody: 'Bb3:1 Bb3:.75 Bb3:.25 Bb3:1 Db4:.75 C4:.25 C4:.75 Bb3:.25 Bb3:.75 A3:.25 Bb3:2' },
  { id: 'pd-cuna-brahms', title: 'Canción de cuna', artist: 'Johannes Brahms', titleAliases: ['Cancion de cuna', 'Wiegenlied', 'Lullaby', 'Canción de cuna de Brahms', 'Arrorró'], artistAliases: ['Brahms'], year: 1868, genre: 'Clásica', subgenre: 'Lied', country: 'Alemania', difficulty: 1, bpm: 110,
    melody: 'E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5:1 B4:1.5 A4:.5 A4:1 G4:1 D4:.5 E4:.5 F4:1 D4:1 D4:.5 E4:.5 F4:2 D4:.5 F4:.5 B4:.5 A4:.5 G4:1 B4:1 C5:2' },
  { id: 'pd-marsellesa', title: 'La Marsellesa', artist: 'Claude-Joseph Rouget de Lisle', titleAliases: ['Marsellesa', 'La Marseillaise', 'Marseillaise', 'Himno de Francia'], artistAliases: ['Rouget de Lisle', 'Rouget de l Isle'], year: 1792, genre: 'Himno', subgenre: 'Himno nacional', country: 'Francia', difficulty: 3, bpm: 108,
    melody: 'D4:.5 D4:.5 D4:.5 G4:1 G4:1 A4:1 A4:1 D5:1.5 B4:.5 G4:.75 G4:.25 B4:.75 G4:.25 E4:1 C5:2 A4:.75 F#4:.25 G4:2' },
  { id: 'pd-cumple', title: 'Cumpleaños feliz', artist: 'Patty y Mildred Hill', titleAliases: ['Happy Birthday', 'Feliz cumpleaños', 'Cumpleaños', 'Happy Birthday to You'], artistAliases: ['Hill', 'Mildred Hill', 'Patty Hill', 'Hermanas Hill', 'Hill Sisters'], year: 1893, genre: 'Popular', subgenre: 'Celebración', country: 'Estados Unidos', difficulty: 1, bpm: 110,
    melody: 'G4:.75 G4:.25 A4:1 G4:1 C5:1 B4:2 G4:.75 G4:.25 A4:1 G4:1 D5:1 C5:2 G4:.75 G4:.25 G5:1 E5:1 C5:1 B4:1 A4:1 F5:.75 F5:.25 E5:1 C5:1 D5:1 C5:2',
    rights: PD('Melodía de "Good Morning to All" (1893), de dominio público. Interpretación sintetizada original.') },
  { id: 'pd-jingle', title: 'Jingle Bells', artist: 'James Lord Pierpont', titleAliases: ['Cascabeles', 'Cascabel', 'Navidad navidad', 'Jingle Bell'], artistAliases: ['Pierpont', 'James Pierpont'], year: 1857, genre: 'Navidad', subgenre: 'Villancico', country: 'Estados Unidos', difficulty: 1, bpm: 160,
    melody: 'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2' },
  { id: 'pd-noche-paz', title: 'Noche de paz', artist: 'Franz Xaver Gruber', titleAliases: ['Stille Nacht', 'Silent Night', 'Noche de paz noche de amor'], artistAliases: ['Gruber', 'Franz Gruber'], year: 1818, genre: 'Navidad', subgenre: 'Villancico', country: 'Austria', difficulty: 1, bpm: 100,
    melody: 'G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3' },
  { id: 'pd-cucaracha', title: 'La cucaracha', artist: 'Tradicional', titleAliases: ['Cucaracha'], artistAliases: [...TRAD, 'tradicional mexicana'], year: 1910, genre: 'Folclore', subgenre: 'Corrido', country: 'México', difficulty: 1, bpm: 150,
    melody: 'C4:.5 C4:.5 C4:.5 F4:1 A4:1.5 C4:.5 C4:.5 C4:.5 F4:1 A4:1.5 R:.5 F4:.5 F4:.5 E4:.5 E4:.5 D4:.5 D4:.5 C4:2' },
  { id: 'pd-bella-ciao', title: 'Bella ciao', artist: 'Tradicional', titleAliases: ['Bella chao', 'O bella ciao'], artistAliases: [...TRAD, 'tradicional italiana'], year: 1944, genre: 'Folclore', subgenre: 'Canción popular', country: 'Italia', difficulty: 1, bpm: 130,
    melody: 'E4:.5 A4:.5 B4:.5 C5:.5 A4:2 E4:.5 A4:.5 B4:.5 C5:.5 A4:2 E4:.5 A4:.5 B4:.5 C5:1 B4:.5 A4:.5 C5:1 B4:.5 A4:.5 E5:1 E5:1 E5:1 D5:.5 E5:.5 F5:.5 F5:1.5',
    rights: PD('Melodía tradicional. Se evita cualquier arreglo o grabación moderna. Verificar estado por territorio antes de la venta.') },
  { id: 'pd-greensleeves', title: 'Greensleeves', artist: 'Tradicional', titleAliases: ['Mangas verdes', 'Green Sleeves'], artistAliases: [...TRAD, 'tradicional inglesa'], year: 1580, genre: 'Folclore', subgenre: 'Balada renacentista', country: 'Inglaterra', difficulty: 3, bpm: 132,
    melody: 'A4:1 C5:2 D5:1 E5:1.5 F5:.5 E5:1 D5:2 B4:1 G4:1.5 A4:.5 B4:1 C5:2 A4:1 A4:1.5 G#4:.5 A4:1 B4:2 G#4:1 E4:2' },
  { id: 'pd-martinillo', title: 'Martinillo', artist: 'Tradicional', titleAliases: ['Frère Jacques', 'Frere Jacques', 'Fray Santiago', 'Campanero', 'Are You Sleeping'], artistAliases: [...TRAD, 'tradicional francesa'], year: 1780, genre: 'Infantil', subgenre: 'Canon', country: 'Francia', difficulty: 1, bpm: 120,
    melody: 'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4:1 C4:1 G4:.5 A4:.5 G4:.5 F4:.5 E4:1 C4:1' },
  { id: 'pd-estrellita', title: 'Estrellita', artist: 'Tradicional', titleAliases: ['Estrellita dónde estás', 'Twinkle Twinkle Little Star', 'Twinkle Twinkle', 'Ah vous dirai-je maman', 'Brilla brilla'], artistAliases: [...TRAD, 'tradicional francesa', 'Mozart'], year: 1761, genre: 'Infantil', subgenre: 'Canción de cuna', country: 'Francia', difficulty: 1, bpm: 110,
    melody: 'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2' },
  { id: 'pd-saints', title: 'When the Saints Go Marching In', artist: 'Tradicional', titleAliases: ['When the Saints', 'Oh When the Saints', 'Cuando los santos marchan', 'The Saints'], artistAliases: [...TRAD, 'gospel tradicional', 'espiritual tradicional'], year: 1896, genre: 'Gospel', subgenre: 'Jazz tradicional', country: 'Estados Unidos', difficulty: 2, bpm: 150,
    melody: 'C4:1 E4:1 F4:1 G4:5 C4:1 E4:1 F4:1 G4:5 C4:1 E4:1 F4:1 G4:2 E4:2 C4:2 E4:2 D4:4' },
  { id: 'pd-susanna', title: 'Oh! Susanna', artist: 'Stephen Foster', titleAliases: ['Oh Susana', 'Oh Susanna', 'Susana'], artistAliases: ['Foster'], year: 1848, genre: 'Folk', subgenre: 'Minstrel', country: 'Estados Unidos', difficulty: 2, bpm: 140,
    melody: 'C4:.5 D4:.5 E4:1 G4:1 G4:1.5 A4:.5 G4:1 E4:1 C4:1.5 D4:.5 E4:1 E4:1 D4:1 C4:1 D4:3' }
];

const demoTracks: TrackDef[] = demoSeeds.map(({ bpm, melody, rights, ...t }) => ({
  ...t,
  expansion: 'demo-clasicos',
  explicit: false,
  spotifyUrl: null,
  audio: { kind: 'synth', bpm, notes: m(melody) },
  rights: rights ?? PD(),
  active: true
}));

type Meta = [id: string, title: string, artist: string, year: number, genre: string, country: string, difficulty: 1 | 2 | 3 | 4 | 5, titleAliases?: string[], artistAliases?: string[], explicit?: boolean];

const generalMeta: Meta[] = [
  ['gen-despacito', 'Despacito', 'Luis Fonsi', 2017, 'Reguetón', 'Puerto Rico', 1, [], ['Fonsi', 'Luis Fonsi y Daddy Yankee', 'Daddy Yankee']],
  ['gen-bohemian', 'Bohemian Rhapsody', 'Queen', 1975, 'Rock', 'Reino Unido', 1, ['Rapsodia bohemia']],
  ['gen-billie-jean', 'Billie Jean', 'Michael Jackson', 1982, 'Pop', 'Estados Unidos', 1, [], ['MJ']],
  ['gen-carnaval', 'La vida es un carnaval', 'Celia Cruz', 2003, 'Salsa', 'Cuba', 1, ['La vida es un carnival']],
  ['gen-vivir-vida', 'Vivir mi vida', 'Marc Anthony', 2013, 'Salsa', 'Estados Unidos', 2],
  ['gen-propuesta', 'Propuesta indecente', 'Romeo Santos', 2013, 'Bachata', 'Estados Unidos', 2],
  ['gen-obsesion', 'Obsesión', 'Aventura', 2002, 'Bachata', 'Estados Unidos', 2],
  ['gen-bilirrubina', 'La bilirrubina', 'Juan Luis Guerra', 1990, 'Merengue', 'República Dominicana', 2, [], ['Juan Luis Guerra 4.40', 'Juan Luis Guerra y 440']],
  ['gen-suavemente', 'Suavemente', 'Elvis Crespo', 1998, 'Merengue', 'Puerto Rico', 1],
  ['gen-gasolina', 'Gasolina', 'Daddy Yankee', 2004, 'Reguetón', 'Puerto Rico', 1],
  ['gen-mi-gente', 'Mi gente', 'J Balvin', 2017, 'Reguetón', 'Colombia', 2, [], ['J Balvin y Willy William', 'Willy William']],
  ['gen-tusa', 'Tusa', 'Karol G', 2019, 'Música urbana', 'Colombia', 2, [], ['Karol G y Nicki Minaj', 'Nicki Minaj']],
  ['gen-levels', 'Levels', 'Avicii', 2011, 'Electrónica', 'Suecia', 2],
  ['gen-one-more-time', 'One More Time', 'Daft Punk', 2000, 'Electrónica', 'Francia', 2],
  ['gen-sandstorm', 'Sandstorm', 'Darude', 1999, 'Electrónica', 'Finlandia', 3],
  ['gen-titanium', 'Titanium', 'David Guetta', 2011, 'Electrónica', 'Francia', 2, [], ['David Guetta y Sia', 'Sia']],
  ['gen-lose-yourself', 'Lose Yourself', 'Eminem', 2002, 'Hip-hop', 'Estados Unidos', 2, [], [], true],
  ['gen-teen-spirit', 'Smells Like Teen Spirit', 'Nirvana', 1991, 'Rock', 'Estados Unidos', 2],
  ['gen-musica-ligera', 'De música ligera', 'Soda Stereo', 1990, 'Rock', 'Argentina', 2],
  ['gen-sweet-child', "Sweet Child O' Mine", "Guns N' Roses", 1987, 'Rock', 'Estados Unidos', 2, ['Sweet Child of Mine'], ['Guns and Roses', 'GNR']],
  ['gen-hotel-california', 'Hotel California', 'Eagles', 1976, 'Rock', 'Estados Unidos', 2, [], ['The Eagles']],
  ['gen-rolling', 'Rolling in the Deep', 'Adele', 2010, 'Pop', 'Reino Unido', 2],
  ['gen-hips', "Hips Don't Lie", 'Shakira', 2006, 'Pop', 'Colombia', 1, ['Hips Dont Lie'], ['Shakira y Wyclef Jean']],
  ['gen-bad-guy', 'Bad Guy', 'Billie Eilish', 2019, 'Pop', 'Estados Unidos', 2],
  ['gen-dancing-queen', 'Dancing Queen', 'ABBA', 1976, 'Pop', 'Suecia', 1],
  ['gen-corazon-partio', 'Corazón partío', 'Alejandro Sanz', 1997, 'Balada', 'España', 2, ['Corazón partido']],
  ['gen-como-la-flor', 'Como la flor', 'Selena', 1992, 'Cumbia', 'Estados Unidos', 2, [], ['Selena Quintanilla']],
  ['gen-gangnam', 'Gangnam Style', 'PSY', 2012, 'Pop', 'Corea del Sur', 1]
];

const generalTracks: TrackDef[] = generalMeta.map(([id, title, artist, year, genre, country, difficulty, ta = [], aa = [], explicit = false]) => ({
  id,
  title,
  artist,
  titleAliases: ta,
  artistAliases: aa,
  year,
  genre,
  country,
  difficulty,
  expansion: 'general',
  explicit,
  spotifyUrl: null,
  audio: null,
  rights: { status: 'pending_license', note: 'Requiere licencia de grabación (sello) y de composición (editorial) para usar un fragmento en el juego.' },
  active: true
}));

export const SEED_TRACKS: TrackDef[] = [...demoTracks, ...generalTracks];

export interface ExpansionDef {
  id: string;
  name: string;
  tagline: string;
  color: string;
  status: 'owned' | 'available' | 'soon';
  compatibleWith: string[] | 'all';
}

export const EXPANSIONS: ExpansionDef[] = [
  { id: 'demo-clasicos', name: 'Clásicos Universales', tagline: 'Edición demo jugable · composiciones de dominio público', color: '#00D9FF', status: 'owned', compatibleWith: 'all' },
  { id: 'mis-canciones', name: 'Mis canciones', tagline: 'Canciones que subes tú al servidor · solo uso privado', color: '#19C86A', status: 'owned', compatibleWith: 'all' },
  { id: 'general', name: 'Edición General', tagline: 'Pop, rock, salsa, merengue, bachata, reguetón, electrónica y más', color: '#8B5CF6', status: 'owned', compatibleWith: 'all' },
  { id: 'electronic', name: 'Electronic Edition', tagline: 'House, techno, trance y los drops que hicieron historia', color: '#22D3EE', status: 'soon', compatibleWith: 'all' },
  { id: 'salsa', name: 'Salsa Edition', tagline: 'De la vieja guardia a la salsa romántica', color: '#FB923C', status: 'soon', compatibleWith: 'all' },
  { id: 'rock-legends', name: 'Rock Legends', tagline: 'Riffs que todos tararean', color: '#EF4444', status: 'soon', compatibleWith: 'all' },
  { id: 'reggaeton', name: 'Reggaeton Edition', tagline: 'Del perreo old school a la nueva escuela', color: '#F472B6', status: 'soon', compatibleWith: 'all' },
  { id: 'latin-party', name: 'Latin Party', tagline: 'Todo lo que suena en una fiesta latina', color: '#FACC15', status: 'soon', compatibleWith: 'all' },
  { id: '80s-90s', name: '80s & 90s Classics', tagline: 'Sintetizadores, baladas y grunge', color: '#A78BFA', status: 'soon', compatibleWith: 'all' },
  { id: '2000s', name: '2000s Hits', tagline: 'La década del MP3', color: '#38BDF8', status: 'soon', compatibleWith: 'all' },
  { id: 'afro-tribal', name: 'Afro & Tribal House', tagline: 'Percusión, groove y trance', color: '#F59E0B', status: 'soon', compatibleWith: 'all' },
  { id: 'pop-divas', name: 'Pop Divas', tagline: 'Las voces que dominaron las listas', color: '#E879F9', status: 'soon', compatibleWith: 'all' },
  { id: 'romantic', name: 'Romantic Hits', tagline: 'Baladas para cantar a todo pulmón', color: '#FB7185', status: 'soon', compatibleWith: 'all' },
  { id: 'venezuela', name: 'Venezuelan Classics', tagline: 'Gaita, joropo, salsa y pop venezolano', color: '#FDE047', status: 'soon', compatibleWith: 'all' },
  { id: 'chile', name: 'Chilean Hits', tagline: 'Cumbia, rock y pop chileno', color: '#60A5FA', status: 'soon', compatibleWith: 'all' }
];
