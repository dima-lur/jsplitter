/**
 * SQLite database returned by {@link utils.OpenDatabase}.<br>
 * All operations are synchronous. Use a {@link Worker} for large imports, maintenance, or expensive queries when blocking the panel UI would be undesirable.<br>
 * Parameter arrays are positional and must contain exactly as many values as the SQL statement requires. Booleans are stored as SQLite integers 0/1. Query results map SQLite NULL to <b>null</b>, INTEGER/REAL to number, TEXT to string, and BLOB to <b>Uint8Array</b>.<br>
 * Database operations report SQL, binding, transaction-state, and closed-handle errors as JavaScript exceptions. {@link SQLiteDatabase#Close Close} is idempotent and does not throw.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function SQLiteDatabase() {

    /**
     * Closes the database. Calling {@link SQLiteDatabase#Close Close} more than once is allowed.<br>
     * This method does not throw; any SQLite close status is not exposed to script code.
     *
     * @return {boolean} true after the database has been closed.
     * @worker
     */
    this.Close = function () { };

    /**
     * Starts a deferred transaction by executing <b>BEGIN TRANSACTION</b>.
     *
     * @throws {Error} If a SQLite/database error occurs, including when the database is closed or the transaction cannot be started.
     *
     * @example
     * try {
     *     db.Exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)');
     *     db.Begin();
     *     db.Exec('INSERT INTO items(name) VALUES (?)', ['Alpha']);
     *     db.Exec('INSERT INTO items(name) VALUES (?)', ['Beta']);
     *     db.Commit();
     * } catch (e) {
     *     try {
     *         db.Rollback();
     *     } catch (rollbackError) {
     *         console.log(`Rollback failed: ${rollbackError.message}`);
     *     }
     *     throw e;
     * }
     * @worker
     */
    this.Begin = function () { };

    /**
     * Commits the current transaction by executing <b>COMMIT</b>.
     *
     * @throws {Error} If a SQLite/database error occurs, including when the database is closed or no transaction can be committed.
     * @worker
     */
    this.Commit = function () { };

    /**
     * Rolls back the current transaction by executing <b>ROLLBACK</b>.
     *
     * @throws {Error} If a SQLite/database error occurs, including when the database is closed or no transaction can be rolled back.
     * @worker
     */
    this.Rollback = function () { };

    /**
     * Executes one or more SQL statements. Result rows, if any, are discarded.<br>
     * When multiple statements are supplied, parameter values are consumed in SQLite parameter-index order across the statements. The total parameter count must match exactly.
     *
     * @param {string} sql SQL text to execute.
     * @param {Array<*>=} [parameters] Positional parameter values. Supported element types: <b>null</b>, boolean, number, string, <b>ArrayBuffer</b>, and typed-array views.
     * @throws {Error} If an SQL, parameter, binding, or database error occurs, including an invalid parameter array/count or when the database is closed.
     *
     * @example
     * db.Exec(
     *     'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT);' +
     *     'INSERT INTO items(name) VALUES (?);',
     *     ['Example']
     * );
     * @worker
     */
    this.Exec = function (sql, parameters) { };

    /**
     * Executes exactly one SQL statement and returns all rows as plain JavaScript objects keyed by column name.<br>
     * SQLite NULL becomes <b>null</b>, INTEGER/REAL become number, TEXT becomes string, and BLOB becomes <b>Uint8Array</b>. The query must produce unique column names; use SQL aliases when selecting duplicate names.
     *
     * @param {string} sql SQL query to execute.
     * @param {Array<*>=} [parameters] Positional parameter values. Supported element types: <b>null</b>, boolean, number, string, <b>ArrayBuffer</b>, and typed-array views.
     * @return {Array<Object>} Query rows. Returns an empty array when the query produces no rows.
     * @throws {Error} If an SQL, parameter, binding, result-conversion, or database error occurs; multiple SQL statements are supplied; result column names are duplicated; or the database is closed.
     *
     * @example
     * const rows = db.Query(
     *     'SELECT artist, COUNT(*) AS plays FROM history WHERE played_at >= ? GROUP BY artist ORDER BY plays DESC',
     *     [Date.now() - 30 * 24 * 60 * 60 * 1000]
     * );
     * for (const row of rows) {
     *     console.log(`${row.artist}: ${row.plays}`);
     * }
     * @worker
     */
    this.Query = function (sql, parameters) { };

    /**
     * Prepares exactly one SQL statement for repeated execution.
     * The returned statement owns its native SQLite handle. It is finalized automatically when the JavaScript object is destroyed, so calling {@link SQLiteStatement#Close Close} is not required for normal use. Call {@link SQLiteStatement#Close Close} only when the native statement should be released immediately.
     *
     * @param {string} sql SQL statement to prepare.
     * @return {SQLiteStatement} Prepared statement.
     * @throws {Error} If the SQL cannot be prepared, the input does not contain exactly one SQL statement, or the database is closed.
     *
     * @example
     * const insert = db.Prepare('INSERT INTO items(name, score) VALUES (?, ?)');
     * insert.Run(['Alpha', 10]);
     * insert.Run(['Beta', 20]);
     * @worker
     */
    this.Prepare = function (sql) { };

    /**
     * Indicates whether the database is open.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsOpen = false;
}

/**
 * Prepared SQLite statement returned by {@link SQLiteDatabase#Prepare Prepare}.<br>
 * A prepared statement is usable immediately after {@link SQLiteDatabase#Prepare Prepare} succeeds. Its native SQLite handle is finalized automatically when the JavaScript object is destroyed, so explicit cleanup is not required for normal use. {@link SQLiteStatement#Close Close} is provided only for releasing the native statement immediately when it is no longer needed.<br>
 * {@link SQLiteStatement#Run Run} and {@link SQLiteStatement#Query Query} automatically reset the statement and clear all parameter bindings before returning, including when execution throws, so the same active statement can be reused immediately with a new parameter array.<br>
 * Statement operations report parameter, binding, execution, result-conversion, and closed-handle errors as JavaScript exceptions. {@link SQLiteStatement#Close Close} is idempotent and does not throw.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function SQLiteStatement() {

    /**
     * Finalizes the prepared statement immediately and releases its native SQLite handle. Calling {@link SQLiteStatement#Close Close} more than once is allowed.<br>
     * Explicit cleanup is optional: the statement is finalized automatically when the JavaScript object is destroyed. Use {@link SQLiteStatement#Close Close} when early release is useful, for example when many prepared statements are created while other work continues.<br>
     * This method does not throw; any SQLite finalize status is not exposed to script code.
     *
     * @return {boolean} true after the statement has been closed.
     * @worker
     */
    this.Close = function () { };

    /**
     * Executes the prepared statement and discards any result rows. The statement is reset and its bindings are cleared before returning.
     *
     * @param {Array<*>=} [parameters] Positional parameter values. The count must match the prepared statement exactly.
     * @throws {Error} If a parameter, binding, or execution error occurs, including an invalid parameter array/count or when the statement is closed.
     * @worker
     */
    this.Run = function (parameters) { };

    /**
     * Executes the prepared statement and returns all result rows. The statement is reset and its bindings are cleared before returning.
     *
     * @param {Array<*>=} [parameters] Positional parameter values. The count must match the prepared statement exactly.
     * @return {Array<Object>} Query rows as plain JavaScript objects.
     * @throws {Error} If a parameter, binding, execution, or result-conversion error occurs, including an invalid parameter array/count, duplicate result column names, or when the statement is closed.
     * @worker
     */
    this.Query = function (parameters) { };

    /**
     * Explicitly resets the statement and clears its current parameter bindings.<br>
     * This is normally unnecessary after {@link SQLiteStatement#Run Run} or {@link SQLiteStatement#Query Query}, because both methods do it automatically.
     *
     * @throws {Error} If the statement is closed or SQLite fails to clear its parameter bindings.
     * @worker
     */
    this.Reset = function () { };

    /**
     * Indicates whether the prepared statement still owns an active native SQLite handle.<br>
     * This is <b>true</b> immediately after {@link SQLiteDatabase#Prepare Prepare} succeeds and becomes <b>false</b> after {@link SQLiteStatement#Close Close} is called. Normally there is no need to check this property unless the statement is being closed explicitly.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsOpen = false;
}

