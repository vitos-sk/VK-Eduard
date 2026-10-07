/**
 * Минимальная in-memory «база» вместо Supabase для тестов серверных действий.
 * Понимает ровно то, что используют действия: select/insert/update/delete, фильтры
 * eq / gte / lte / in / is / not(…, "is", null), single / maybeSingle, а ещё уникальность
 * `client_id` (код 23505, как в Postgres) — на ней держится защита от повторной отправки.
 */

type Row = Record<string, unknown>;

interface DbError {
  code?: string;
  message: string;
  details?: string;
}

interface Result {
  data: unknown;
  error: DbError | null;
}

const UNIQUE_COLUMNS: Record<string, string[]> = {
  work_entries: ["client_id"],
  site_reports: ["client_id"],
  travel_entries: ["client_id"],
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  private counter = 0;
  /** Таблицы, на вставку в которые база отвечает ошибкой (проверка отката). */
  failInsertInto = new Set<string>();

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  nextId(): string {
    this.counter += 1;

    return `id-${this.counter}`;
  }

  from(table: string): Query {
    return new Query(this, table);
  }
}

class Query implements PromiseLike<Result> {
  private filters: Array<(row: Row) => boolean> = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] = {};
  private wantsRows = false;
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(): this {
    this.wantsRows = true;

    return this;
  }

  insert(payload: Row | Row[]): this {
    this.op = "insert";
    this.payload = payload;

    return this;
  }

  update(payload: Row): this {
    this.op = "update";
    this.payload = payload;

    return this;
  }

  delete(): this {
    this.op = "delete";

    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);

    return this;
  }

  gte(column: string, value: string): this {
    this.filters.push((row) => String(row[column]) >= value);

    return this;
  }

  lte(column: string, value: string): this {
    this.filters.push((row) => String(row[column]) <= value);

    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));

    return this;
  }

  is(column: string, value: null): this {
    this.filters.push((row) => (row[column] ?? null) === value);

    return this;
  }

  not(column: string, _operator: "is", value: null): this {
    this.filters.push((row) => (row[column] ?? null) !== value);

    return this;
  }

  order(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  single(): this {
    this.mode = "single";

    return this;
  }

  maybeSingle(): this {
    this.mode = "maybeSingle";

    return this;
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private run(): Result {
    const rows = this.db.rows(this.table);
    const matches = () => rows.filter((row) => this.filters.every((filter) => filter(row)));

    if (this.op === "insert") {
      if (this.db.failInsertInto.has(this.table)) {
        return { data: null, error: { message: `insert into ${this.table} failed` } };
      }

      const inserted: Row[] = [];

      for (const item of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        for (const column of UNIQUE_COLUMNS[this.table] ?? []) {
          if (rows.some((row) => row[column] === item[column])) {
            return {
              data: null,
              error: { code: "23505", message: `duplicate key value violates unique constraint "${this.table}_${column}_key"` },
            };
          }
        }

        const row = { id: this.db.nextId(), ...item };

        rows.push(row);
        inserted.push(row);
      }

      return this.shape(inserted);
    }

    if (this.op === "update") {
      const updated = matches();

      for (const row of updated) Object.assign(row, this.payload);

      return this.shape(updated);
    }

    if (this.op === "delete") {
      const removed = matches();

      this.db.tables[this.table] = rows.filter((row) => !removed.includes(row));

      return this.shape(removed);
    }

    return this.shape(matches());
  }

  private shape(found: Row[]): Result {
    if (this.mode === "many") return { data: this.wantsRows || this.op === "select" ? found : null, error: null };

    if (found.length === 1 || (this.mode === "maybeSingle" && found.length === 0)) {
      return { data: found[0] ?? null, error: null };
    }

    return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
  }
}
