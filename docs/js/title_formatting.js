/**
 * JSplitter provides global Title Formatting fields for its statistics database and foobar2000 directories. These fields are available wherever foobar2000 evaluates global display fields, including formatting through {@link fb.TitleFormat} and {@link FbTitleFormat#EvalWithMetadb EvalWithMetadb}.
 *
 * <h2>Statistics fields</h2>
 *
 * These values belong to the JSplitter statistics database, not to audio-file tags. Scripts manage them through the linked {@link FbMetadbHandle} methods.
 *
 * <table>
 * <thead><tr><th>Field</th><th>Value</th><th>Setter</th></tr></thead>
 * <tbody>
 * <tr id="jsplitter_playcount"><td><b>%jsplitter_playcount%</b></td><td>Play count stored by the script.</td><td>{@link FbMetadbHandle#SetPlaycount SetPlaycount}</td></tr>
 * <tr id="jsplitter_loved"><td><b>%jsplitter_loved%</b></td><td>Loved value stored by the script.</td><td>{@link FbMetadbHandle#SetLoved SetLoved}</td></tr>
 * <tr id="jsplitter_first_played"><td><b>%jsplitter_first_played%</b></td><td>First-played string stored by the script.</td><td>{@link FbMetadbHandle#SetFirstPlayed SetFirstPlayed}</td></tr>
 * <tr id="jsplitter_last_played"><td><b>%jsplitter_last_played%</b></td><td>Last-played string stored by the script.</td><td>{@link FbMetadbHandle#SetLastPlayed SetLastPlayed}</td></tr>
 * <tr id="jsplitter_rating"><td><b>%jsplitter_rating%</b></td><td>Rating value stored by the script.</td><td>{@link FbMetadbHandle#SetRating SetRating}</td></tr>
 * </tbody>
 * </table>
 *
 * Numeric fields are absent when their stored value is <b>0</b>; string fields are absent when empty. {@link FbMetadbHandle#ClearStats ClearStats} clears all five values. No fixed rating scale or date-string format is imposed by these fields.
 *
 * <h2>Directory fields</h2>
 *
 *
 * <table>
 * <thead><tr><th>Field</th><th>Value</th><th>JavaScript equivalent</th></tr></thead>
 * <tbody>
 * <tr id="jsplitter_fb2k"><td><b>%jsplitter_fb2k%</b></td><td>foobar2000 installation directory.</td><td>{@link fb.FoobarPath}</td></tr>
 * <tr id="jsplitter_fb2k_profile"><td><b>%jsplitter_fb2k_profile%</b></td><td>foobar2000 profile/configuration directory.</td><td>{@link fb.ProfilePath}</td></tr>
 * </tbody>
 * </table>
 *
 * Both values are native filesystem paths and support Unicode. They are initialized at startup and remain fixed for the session. The fields use the <b>jsplitter_</b> prefix so they do not register the unprefixed names used by other components.
 *
 * <h2>Using fields in JavaScript</h2>
 *
 * Evaluate Title Formatting through {@link fb.TitleFormat}; the field names are not JavaScript variables. {@link FbTitleFormat#Eval Eval} with <b>true</b> also evaluates the expression when playback is stopped:
 *
 * ```js
 * const profile = fb.TitleFormat('%jsplitter_fb2k_profile%').Eval(true);
 * const imagePath = profile + '\\images\\cover.png';
 * ```
 * Statistics fields refer to the track being formatted:
 *
 * ```js
 * const track = fb.GetNowPlaying();
 * if (track) {
 *     const rating = fb.TitleFormat('$if2(%jsplitter_rating%,0)').EvalWithMetadb(track);
 *     console.log(rating);
 * }
 * ```
 *
 * <h2>Process environment variables</h2>
 *
 * The directory names <b>jsplitter_fb2k</b> and <b>jsplitter_fb2k_profile</b> are also set as Windows environment variables in the foobar2000 process. Their values are the same paths as the Title Formatting fields. Child processes inherit them when they inherit foobar2000's environment. The system-wide and user environment are not modified.
 *
 * A path input field can expand <b>%jsplitter_fb2k%</b> or <b>%jsplitter_fb2k_profile%</b> if its component supports the corresponding Title Formatting or environment-variable expansion. Registration does not make every text field perform expansion automatically.
 *
 * <h2>Relative paths inside scripts</h2>
 *
 * Supported file and image methods resolve relative paths as described in {@link utils.ReadTextFile}. To obtain the main script's own full path for custom path handling or external tools, use the <b>Path</b> property of {@link window.ScriptInfo}. Directory fields identify foobar2000 directories, not the main script's directory.
 *
 * @module TitleFormatting
 */
