/**
 * Streaming binary reader returned by {@link utils.OpenBinaryReader}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function BinaryReader() {

    /**
     * Reads bytes into an existing <b>Uint8Array</b> without allocating a new buffer.<br>
     * If <b>offset</b> is omitted, reading starts at index 0. If <b>count</b> is omitted, bytes are read up to the end of the buffer.<br>
     * An explicitly supplied <b>offset + count</b> must fit inside the buffer.
     *
     * @param {Uint8Array} buffer Destination buffer.
     * @param {number=} [offset=0] Destination offset in bytes.
     * @param {number=} count Maximum number of bytes to read. Defaults to the remaining buffer size.
     * @return {number} Number of bytes actually read. A nonzero request returning 0 means that no bytes were read: {@link BinaryReader#EOF EOF} is <b>true</b> at clean end of file and <b>false</b> if the read could not be performed. A zero-length request also returns 0.
     * @throws {Error} If the reader is closed.
     * @worker
     */
    this.Read = function (buffer, offset, count) { };

    /**
     * Closes the file. Calling {@link BinaryReader#Close Close} more than once is allowed.
     *
     * @return {boolean} true if the reader is closed successfully; false if closing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * File size in bytes as observed when the reader was opened.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Length = 0;

    /**
     * Number of bytes successfully read from the file.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Position = 0;

    /**
     * Indicates that the current read position has reached the file length recorded when the reader was opened.<br>
     * This property does not report a closed reader or a read failure. Use the return value of {@link BinaryReader#Read Read} to drive the read loop; {@link BinaryReader#EOF EOF} is status information used to distinguish a clean end of file from a failed read.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.EOF = false;

    /**
     * Indicates whether the reader has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * Streaming binary writer returned by {@link utils.OpenBinaryWriter}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function BinaryWriter() {

    /**
     * Writes bytes from an existing <b>Uint8Array</b> without creating a temporary typed array.<br>
     * If <b>offset</b> is omitted, writing starts at index 0. If <b>count</b> is omitted, bytes are written up to the end of the buffer.<br>
     * An explicitly supplied <b>offset + count</b> must fit inside the buffer.
     *
     * @param {Uint8Array} buffer Source buffer.
     * @param {number=} [offset=0] Source offset in bytes.
     * @param {number=} count Number of bytes to write. Defaults to the remaining buffer size.
     * @return {boolean} true on success; false if the buffer/range is invalid or the write fails.
     * @throws {Error} If the writer is closed.
     * @worker
     */
    this.Write = function (buffer, offset, count) { };

    /**
     * Flushes buffered output to the file.
     *
     * @return {boolean} true on success; false if flushing fails.
     * @throws {Error} If the writer is closed.
     * @worker
     */
    this.Flush = function () { };

    /**
     * Closes the file. Calling {@link BinaryWriter#Close Close} more than once is allowed.
     *
     * @return {boolean} true if the writer is closed successfully; false if closing/flushing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Number of bytes successfully written to the file.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Position = 0;

    /**
     * Indicates whether the writer has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * Streaming text reader returned by {@link utils.OpenTextReader}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function TextReader() {

    /**
     * Reads the next line and removes its line terminator.
     *
     * @return {?string} The next decoded line, or <b>null</b> when no line can be returned. When <b>null</b> is returned, {@link TextReader#EOF EOF} is <b>true</b> for clean end of file and <b>false</b> for a read or decoding failure.
     * @throws {Error} If the reader is closed.
     * @worker
     */
    this.ReadLine = function () { };

    /**
     * Closes the file. Calling {@link TextReader#Close Close} more than once is allowed.
     *
     * @return {boolean} true if the reader is closed successfully; false if closing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Indicates that a clean end of file has been observed while reading.<br>
     * This property does not report a closed reader or a read/decoding failure. Do not use it as a pre-read loop condition; use the return value of {@link TextReader#ReadLine ReadLine} to drive the loop, then inspect {@link TextReader#EOF EOF} when {@link TextReader#ReadLine ReadLine} returns <b>null</b>.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.EOF = false;

    /**
     * Indicates whether the reader has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * Streaming text writer returned by {@link utils.OpenTextWriter}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function TextWriter() {

    /**
     * Writes text at the current file position without adding a line terminator.
     *
     * @param {string} content Text to write.
     * @return {boolean} true on success; false if the text cannot be encoded in the selected codepage or the write fails.
     * @throws {Error} If the writer is closed.
     * @worker
     */
    this.Write = function (content) { };

    /**
     * Writes text followed by a CRLF line terminator.
     *
     * @param {string} content Text to write.
     * @return {boolean} true on success; false if the text cannot be encoded in the selected codepage or the write fails.
     * @throws {Error} If the writer is closed.
     * @worker
     */
    this.WriteLine = function (content) { };

    /**
     * Flushes buffered output to the file.
     *
     * @return {boolean} true on success; false if flushing fails.
     * @throws {Error} If the writer is closed.
     * @worker
     */
    this.Flush = function () { };

    /**
     * Closes the file. Calling {@link TextWriter#Close Close} more than once is allowed.
     *
     * @return {boolean} true if the writer is closed successfully; false if closing/flushing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Indicates whether the writer has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}


/**
 * Object returned by {@link utils.GetDriveInfo}.<br>
 * Property names and semantics follow the Microsoft Scripting Runtime <b>Drive</b> object where applicable.
 *
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function DriveInfo() {

    /**
     * Drive path, for example <b>C:</b>. For a mapped network drive this is still the mapped drive path.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.Path = "";

    /**
     * Root folder path, for example <b>C:\</b>.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.RootFolder = "";

    /**
     * Drive letter without the colon, or an empty string when the volume has no drive letter.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.DriveLetter = "";

    /**
     * Drive type.<br>
     * Values are compatible with <b>Scripting.FileSystemObject</b>:<br>
     * 0 - unknown, 1 - removable, 2 - fixed, 3 - network, 4 - CD-ROM, 5 - RAM disk.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.DriveType = 0;

    /**
     * true if volume or space information can be queried.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsReady = false;

    /**
     * Volume label, or an empty string if unavailable. Writable for ready volumes.
     *
     * @type {string}
     * @worker
     */
    this.VolumeName = "";

    /**
     * File system name, or an empty string if unavailable.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.FileSystem = "";

    /**
     * Volume serial number, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.SerialNumber = 0;

    /**
     * Share name for a network drive, or an empty string for a local drive or when unavailable.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.ShareName = "";

    /**
     * Total size in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.TotalSize = 0;

    /**
     * Total free space in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.FreeSpace = 0;

    /**
     * Free space available to the current user in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.AvailableSpace = 0;
}

/**
 * Object returned by {@link utils.Run}.<br>
 *
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function RunResult() {

    /**
     * High-level operation result.<br>
     * If wait=false, true means that ShellExecuteEx accepted the shell request.<br>
     * If wait=true and a process exit code is available, true means that the process exited with code 0.<br>
     * A non-zero process exit code is reported as OK=false, while Win32Error usually remains 0.<br>
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.OK = false;

    /**
     * Process exit code.<br>
     * This value is meaningful when wait=true and the launched process handle was available.<br>
     * If wait=false, this value is usually 0.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.ExitCode = 0;

    /**
     * Win32 error code returned by GetLastError, or an internally assigned Win32 error code.<br>
     * This is 0 on success.<br>
     * If OK=false and Win32Error is 0, the process was usually started successfully but returned a non-zero ExitCode.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Win32Error = 0;

    /**
     * Native ShellExecuteEx result code.<br>
     * Values greater than 32 usually indicate a successful shell-level operation.<br>
     * Values less than or equal to 32 indicate a shell-level error, such as file not found, access denied, no association, or invalid executable format.<br>
     * This value describes the shell operation itself, not the launched process exit code.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.ShellCode = 0;
}

