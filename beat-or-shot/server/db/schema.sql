-- BEAT OR SHOT · Modelo de datos de producción (PostgreSQL 15+)
-- El prototipo usa memoria + JSON; este esquema es el destino para persistencia, historial y analítica.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ───────── Identidad ─────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias         text NOT NULL CHECK (char_length(alias) BETWEEN 1 AND 18),
  avatar        text NOT NULL,
  is_guest      boolean NOT NULL DEFAULT true,
  email         citext UNIQUE,                -- solo cuentas registradas (adultos)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  token_hash    bytea NOT NULL UNIQUE,        -- nunca se guarda el token en claro
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ───────── Catálogo ─────────
CREATE TABLE expansions (
  id            text PRIMARY KEY,             -- 'general', 'salsa', …
  name          text NOT NULL,
  tagline       text NOT NULL,
  color         text NOT NULL,
  status        text NOT NULL CHECK (status IN ('owned','available','soon')),
  compatible_with text[]                      -- NULL = compatible con todas
);

CREATE TABLE decks (                          -- ediciones físicas impresas
  id            text PRIMARY KEY,             -- 'GEN1'
  expansion_id  text NOT NULL REFERENCES expansions(id),
  card_secret_version int NOT NULL DEFAULT 1,
  printed_at    date
);

CREATE TABLE challenges (                     -- definiciones de cartas especiales (y TRACK)
  id            text PRIMARY KEY,             -- 'dance_battle', 'doble_drop', …
  type          text NOT NULL CHECK (type IN ('TRACK','POWER_UP','CHALLENGE','PENALTY','WILD')),
  name          text NOT NULL,
  short         text NOT NULL,
  description   text NOT NULL,
  adults_only   boolean NOT NULL DEFAULT false,
  min_players   int,
  needs_target  boolean NOT NULL DEFAULT false,
  rarity        text CHECK (rarity IN ('common','rare','legendary'))
);

CREATE TABLE cards (                          -- cada carta física
  deck_id       text NOT NULL REFERENCES decks(id),
  serial        int  NOT NULL,
  challenge_id  text NOT NULL REFERENCES challenges(id),
  code          text NOT NULL UNIQUE,         -- XXXX-XXXX (HMAC), lo que lleva el QR
  PRIMARY KEY (deck_id, serial)
);

CREATE TABLE tracks (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  artist        text NOT NULL,
  year          int  NOT NULL,
  genre         text NOT NULL,
  subgenre      text,
  country       text NOT NULL,
  difficulty    smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  expansion_id  text NOT NULL REFERENCES expansions(id),
  explicit      boolean NOT NULL DEFAULT false,
  spotify_url   text CHECK (spotify_url ~ '^https://open\.spotify\.com/'),  -- solo referencia
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tracks_expansion_idx ON tracks (expansion_id, difficulty) WHERE active;

CREATE TABLE track_aliases (
  track_id      text NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('title','artist')),
  value         text NOT NULL,
  PRIMARY KEY (track_id, kind, value)
);

CREATE TABLE licensed_audio_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id      text NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('synth','file')),
  storage_url   text,                          -- privado; se sirve por token
  synth_score   jsonb,                         -- notas para obras de dominio público
  clip_start_s  numeric(6,2) NOT NULL DEFAULT 0,
  clip_dur_s    numeric(6,2) NOT NULL DEFAULT 15,
  rights_status text NOT NULL CHECK (rights_status IN ('public_domain_composition','licensed','pending_license')),
  master_holder text,
  publisher     text,
  license_id    text,
  territory     text,
  expires_at    date,
  note          text,
  CHECK (rights_status <> 'licensed' OR (master_holder IS NOT NULL AND license_id IS NOT NULL))
);

-- ───────── Partidas ─────────
CREATE TABLE rooms (
  code          char(6) PRIMARY KEY,
  host_user_id  uuid REFERENCES users(id),
  phase         text NOT NULL,
  config        jsonb NOT NULL,                -- RoomConfig (incluye family_mode)
  family_mode   boolean NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz
);

CREATE TABLE players (
  id            text PRIMARY KEY,
  room_code     char(6) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id),
  name          text NOT NULL,
  avatar        text NOT NULL,
  is_minor      boolean NOT NULL,
  partner_id    text REFERENCES players(id),
  seat          int NOT NULL,
  removed       boolean NOT NULL DEFAULT false
);

CREATE TABLE turns (
  id            bigserial PRIMARY KEY,
  room_code     char(6) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  number        int NOT NULL,
  player_id     text NOT NULL REFERENCES players(id),
  deck_id       text, serial int,              -- carta física escaneada (NULL si virtual)
  challenge_id  text NOT NULL REFERENCES challenges(id),
  via           text NOT NULL CHECK (via IN ('qr','virtual')),
  track_id      text REFERENCES tracks(id),
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  UNIQUE (room_code, deck_id, serial)          -- una carta física no puntúa dos veces por partida
);

CREATE TABLE answers (
  id            bigserial PRIMARY KEY,
  turn_id       bigint NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  player_id     text NOT NULL REFERENCES players(id),
  via_partner   boolean NOT NULL DEFAULT false,
  given_title   text, given_artist text, given_year int, choice int,
  title_ok      boolean, artist_ok boolean, year_ok boolean,
  answered_ms   int,
  points        int NOT NULL,
  breakdown     text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE votes (
  turn_id       bigint NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  voter_id      text NOT NULL REFERENCES players(id),
  for_id        text REFERENCES players(id),
  approve       boolean,
  weight        smallint NOT NULL DEFAULT 1,
  PRIMARY KEY (turn_id, voter_id)              -- un voto por jugador
);

CREATE TABLE power_ups (                       -- efectos activos/consumidos
  id            bigserial PRIMARY KEY,
  player_id     text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  effect        text NOT NULL,
  granted_turn  bigint REFERENCES turns(id),
  consumed_turn bigint REFERENCES turns(id)
);

CREATE TABLE rewards (                         -- tarjetas verde/roja/amarilla y premios de racha
  id            bigserial PRIMARY KEY,
  player_id     text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  turn_id       bigint REFERENCES turns(id),
  kind          text NOT NULL CHECK (kind IN ('green','red','yellow','streak','greens_bonus','title')),
  detail        text,
  points        int NOT NULL DEFAULT 0
);

CREATE TABLE scores (                          -- foto al final de cada turno
  room_code     char(6) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  turn_number   int NOT NULL,
  player_id     text NOT NULL REFERENCES players(id),
  score         int NOT NULL CHECK (score >= 0),
  rank          int NOT NULL,
  wildcards     jsonb NOT NULL,
  PRIMARY KEY (room_code, turn_number, player_id)
);

CREATE TABLE game_events (
  id            bigserial PRIMARY KEY,
  room_code     char(6) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  at            timestamptz NOT NULL DEFAULT now(),
  type          text NOT NULL,                 -- player_connected, card_scanned, vote_opened, results_revealed…
  payload       jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX game_events_room_idx ON game_events (room_code, at);
