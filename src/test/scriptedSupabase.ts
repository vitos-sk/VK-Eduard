/**
 * Клиент Supabase для тестов, где важно не «что лежит в базе», а «какие запросы и от чьего имени ушли».
 * Каждый запрос записывается (`calls`), а ответ даёт сценарий теста. Так проверяем безопасность серверных действий:
 * сервисный ключ не должен вызываться, пока обычный клиент (с правами RLS) не подтвердил доступ.
 */

export interface Call {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  /** Условия `eq` и `is`, например `{ id: "x", owner_id: "me" }`. */
  filters: Record<string, unknown>;
  payload: unknown;
}

export interface Reply {
  data: unknown;
  error: { code?: string; message: string } | null;
}

export type Script = (call: Call) => Reply;

class ScriptedQuery implements PromiseLike<Reply> {
  private call: Call;

  constructor(
    private script: Script,
    private calls: Call[],
    table: string,
  ) {
    this.call = { table, op: "select", filters: {}, payload: null };
  }

  select(): this {
    return this;
  }

  insert(payload: unknown): this {
    this.call.op = "insert";
    this.call.payload = payload;

    return this;
  }

  update(payload: unknown): this {
    this.call.op = "update";
    this.call.payload = payload;

    return this;
  }

  upsert(payload: unknown): this {
    this.call.op = "upsert";
    this.call.payload = payload;

    return this;
  }

  delete(): this {
    this.call.op = "delete";

    return this;
  }

  eq(column: string, value: unknown): this {
    this.call.filters[column] = value;

    return this;
  }

  is(column: string, value: unknown): this {
    this.call.filters[column] = value;

    return this;
  }

  in(column: string, value: unknown): this {
    this.call.filters[column] = value;

    return this;
  }

  order(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  maybeSingle(): this {
    return this;
  }

  single(): this {
    return this;
  }

  then<A = Reply, B = never>(
    onfulfilled?: ((value: Reply) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    this.calls.push(this.call);

    return Promise.resolve(this.script(this.call)).then(onfulfilled, onrejected);
  }
}

export function scriptedClient(script: Script) {
  const calls: Call[] = [];

  return {
    calls,
    from: (table: string) => new ScriptedQuery(script, calls, table),
    /** Вызов функции базы: в сценарий приходит как таблица `rpc:<имя>`, аргументы лежат в `payload`. */
    rpc: (name: string, args: unknown) => {
      const call: Call = { table: `rpc:${name}`, op: "select", filters: {}, payload: args };
      calls.push(call);

      return Promise.resolve(script(call));
    },
  };
}

export const ok = (data: unknown): Reply => ({ data, error: null });
export const fail = (message = "boom"): Reply => ({ data: null, error: { message } });
