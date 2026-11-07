// Durable Object « Leaderboard » : classement hebdomadaire des quiz (stockage SQLite intégré à Cloudflare).
import { DurableObject } from "cloudflare:workers";

export interface Entry {
  pseudo: string;
  score: number;
  total: number;
  ms: number;
}

export class Leaderboard extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS scores (
      week TEXT, board TEXT, pseudo TEXT, score INTEGER, total INTEGER, ms INTEGER, created INTEGER,
      PRIMARY KEY (week, board, pseudo))`);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS hits (key TEXT, ts INTEGER)`);
  }

  /** Top N de la semaine pour un classement (ex. "constantes:pros"). */
  top(week: string, board: string, limit = 10): Entry[] {
    return this.ctx.storage.sql
      .exec(
        `SELECT pseudo, score, total, ms FROM scores WHERE week = ? AND board = ?
         ORDER BY score DESC, ms ASC, created ASC LIMIT ?`,
        week,
        board,
        limit,
      )
      .toArray() as unknown as Entry[];
  }

  /**
   * Enregistre un score (on garde le meilleur par pseudo et par semaine).
   * `who` = empreinte anonyme de l'appareil, pour limiter les envois (10 par heure).
   * Renvoie le rang obtenu, ou une erreur.
   */
  submit(week: string, board: string, e: Entry, who: string): { ok: true; rank: number } | { ok: false; error: string } {
    const now = Date.now();
    const sql = this.ctx.storage.sql;
    sql.exec(`DELETE FROM hits WHERE ts < ?`, now - 3600_000);
    const n = sql.exec(`SELECT COUNT(*) AS n FROM hits WHERE key = ?`, who).one().n as number;
    if (n >= 10) return { ok: false, error: "trop" };
    sql.exec(`INSERT INTO hits (key, ts) VALUES (?, ?)`, who, now);

    const prev = sql
      .exec(`SELECT score, ms FROM scores WHERE week = ? AND board = ? AND pseudo = ? COLLATE NOCASE`, week, board, e.pseudo)
      .toArray()[0] as { score: number; ms: number } | undefined;
    const better = !prev || e.score > prev.score || (e.score === prev.score && e.ms < prev.ms);
    if (better) {
      sql.exec(`DELETE FROM scores WHERE week = ? AND board = ? AND pseudo = ? COLLATE NOCASE`, week, board, e.pseudo);
      sql.exec(
        `INSERT INTO scores (week, board, pseudo, score, total, ms, created) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        week, board, e.pseudo, e.score, e.total, e.ms, now,
      );
    }
    const best = better ? e : { ...e, score: prev!.score, ms: prev!.ms };
    const rank = (sql
      .exec(
        `SELECT COUNT(*) AS n FROM scores WHERE week = ? AND board = ? AND (score > ? OR (score = ? AND ms < ?))`,
        week, board, best.score, best.score, best.ms,
      )
      .one().n as number) + 1;
    // Ménage : on ne garde que les 8 dernières semaines.
    sql.exec(`DELETE FROM scores WHERE created < ?`, now - 56 * 24 * 3600_000);
    return { ok: true, rank };
  }
}
