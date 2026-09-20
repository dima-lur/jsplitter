'use strict';

// Worker sample 5: Spectrum Analyzer
// Demonstrates: real-time audio/FFT analysis in a Worker, direct panel rendering and
// transferable Float32Array frame ping-pong. The Worker sends only spectrum levels/peaks;
// on_paint() draws them directly with the panel graphics object, so no offscreen bitmap is
// created per frame. After a frame has painted, the previous Float32Array is transferred back
// to the Worker and reused for a later frame. After the first two frames, the same two buffers
// ping-pong between Worker and panel.
//
// Main mode runs the same analysis engine on the panel thread for comparison. GDI/D2D selects
// the panel rendering backend only; both modes use the same spectrum data and direct paint path.
// Use the in-panel switches to compare execution mode, rendering backend, FFT size and rate limit.
// Only one completed Worker frame is allowed in flight at a time; the next frame starts after
// the previous one has been painted and acknowledged.

let engineMode = 'worker';
let drawMode = 1;
let fftSize = 4096;
let rateMode = 'max';
window.DrawMode = drawMode;

const TARGET_FPS = 120;
const FRAME_TIME = 1000 / TARGET_FPS;
const BAR_WIDTH = 5;
const BAR_GAP = 2;
const BAR_COLOUR = 0xFF42A5F5;
const SPECTRUM_TOP = 92;

const DT_LEFT = 0x0000;
const DT_CENTER = 0x0001;
const DT_VCENTER = 0x0004;
const DT_SINGLELINE = 0x0020;
const DT_NOPREFIX = 0x0800;
const DT_END_ELLIPSIS = 0x8000;
let INFO_FONT = gdi.Font('Segoe UI', 12);
let switchingRenderer = false;

let frame = null;
let frameReturn = null;
let frameNeedsAck = false;
let timing = { audio: 0, analysis: 0, pack: 0, total: 0, interval: 0 };
let frameSequence = 0;
let lastPaintedSequence = -1;
let frameFps = 0;
let paintFps = 0;
let frameCount = 0;
let paintCount = 0;
let frameWindowStart = performance.now();
let paintWindowStart = frameWindowStart;

function createSpectrumEngine(currentFftSize) {
    const FFT_SIZE = currentFftSize;
    const FLOOR_LEVEL = 0.04;
    const IDLE_LEVEL = 0.015;
    let bandCount = 1;
    let bandSampleRate = 0;
    let windowLength = 0;

    const real = new Float64Array(FFT_SIZE);
    const imag = new Float64Array(FFT_SIZE);
    const magnitudes = new Float64Array((FFT_SIZE >> 1) + 1);
    let pcm = new Float32Array(131072);
    const chunkInfo = { SampleCount: 0, ChannelCount: 0, SampleRate: 0, ChannelConfig: 0 };
    let targets = new Float64Array(1);
    let smoothed = new Float64Array(1);
    let peaks = new Float64Array(1);
    let peakVelocity = new Float64Array(1);
    let peakHold = new Float64Array(1);
    let windowCoefficients = new Float64Array(1);
    let bandStart = new Int32Array(1);
    let bandEnd = new Int32Array(1);

    function ensureWindow(length) {
        length = Math.max(1, Math.min(FFT_SIZE, length | 0));
        if (length === windowLength) return windowCoefficients;

        windowLength = length;
        windowCoefficients = new Float64Array(length);
        if (length === 1) {
            windowCoefficients[0] = 1;
        } else {
            const scale = 2 * Math.PI / (length - 1);
            for (let i = 0; i < length; ++i) {
                windowCoefficients[i] = 0.5 - 0.5 * Math.cos(scale * i);
            }
        }
        return windowCoefficients;
    }

    function fft() {
        let j = 0;
        for (let i = 1; i < FFT_SIZE; ++i) {
            let bit = FFT_SIZE >> 1;
            while (j & bit) {
                j ^= bit;
                bit >>= 1;
            }
            j ^= bit;
            if (i < j) {
                let temp = real[i]; real[i] = real[j]; real[j] = temp;
                temp = imag[i]; imag[i] = imag[j]; imag[j] = temp;
            }
        }

        for (let length = 2; length <= FFT_SIZE; length <<= 1) {
            const angle = -2 * Math.PI / length;
            const wLenCos = Math.cos(angle);
            const wLenSin = Math.sin(angle);

            for (let i = 0; i < FFT_SIZE; i += length) {
                let wCos = 1;
                let wSin = 0;
                const half = length >> 1;

                for (let k = 0; k < half; ++k) {
                    const even = i + k;
                    const odd = even + half;
                    const oddReal = real[odd] * wCos - imag[odd] * wSin;
                    const oddImag = real[odd] * wSin + imag[odd] * wCos;
                    const evenReal = real[even];
                    const evenImag = imag[even];

                    real[even] = evenReal + oddReal;
                    imag[even] = evenImag + oddImag;
                    real[odd] = evenReal - oddReal;
                    imag[odd] = evenImag - oddImag;

                    const nextCos = wCos * wLenCos - wSin * wLenSin;
                    wSin = wCos * wLenSin + wSin * wLenCos;
                    wCos = nextCos;
                }
            }
        }
    }

    function configureBands(sampleRate) {
        if (sampleRate === bandSampleRate) return;
        bandSampleRate = sampleRate;

        const nyquist = sampleRate * 0.5;
        const minFrequency = Math.min(30, nyquist * 0.5);
        const maxFrequency = Math.max(minFrequency + 1, Math.min(16000, nyquist * 0.96));
        const ratio = maxFrequency / minFrequency;
        const half = FFT_SIZE >> 1;

        for (let band = 0; band < bandCount; ++band) {
            const t0 = band / bandCount;
            const t1 = (band + 1) / bandCount;
            const f0 = minFrequency * Math.pow(ratio, t0);
            const f1 = minFrequency * Math.pow(ratio, t1);
            const bin0 = Math.max(1, Math.floor(f0 * FFT_SIZE / sampleRate));
            const bin1 = Math.min(half + 1, Math.max(bin0 + 1, Math.ceil(f1 * FFT_SIZE / sampleRate)));
            bandStart[band] = bin0;
            bandEnd[band] = bin1;
        }
    }

    function updateDynamics(dt, floorLevel) {
        const attack = 1 - Math.exp(-dt / 0.018);
        const release = 1 - Math.exp(-dt / 0.095);
        const gravity = 3.0;
        const peakHoldSeconds = 0.10;

        for (let i = 0; i < bandCount; ++i) {
            const target = targets[i];
            let level = smoothed[i] || 0;
            level += (target - level) * (target >= level ? attack : release);
            level = Math.max(floorLevel, Math.min(0.98, level));
            smoothed[i] = level;

            let peak = peaks[i] || 0;
            if (level >= peak) {
                peak = level;
                peakVelocity[i] = 0;
                peakHold[i] = peakHoldSeconds;
            } else {
                const hold = Math.max(0, (peakHold[i] || 0) - dt);
                peakHold[i] = hold;
                if (hold <= 0) {
                    let velocity = (peakVelocity[i] || 0) + gravity * dt;
                    peak -= velocity * dt;
                    peakVelocity[i] = velocity;
                    if (peak <= level) {
                        peak = level;
                        peakVelocity[i] = 0;
                    }
                }
            }
            peaks[i] = Math.max(level, Math.min(0.98, peak));
        }
    }

    function analyse(data, sampleCount, channels, sampleRate, available, dt) {
        const required = sampleCount * channels;
        if (!data || !sampleCount || !channels || !sampleRate || available < required) {
            targets.fill(IDLE_LEVEL);
            updateDynamics(dt, IDLE_LEVEL);
            return;
        }

        const used = Math.min(sampleCount, FFT_SIZE);
        const firstFrame = sampleCount - used;
        const window = ensureWindow(used);

        real.fill(0);
        imag.fill(0);

        for (let frameIndex = 0; frameIndex < used; ++frameIndex) {
            let mono = 0;
            const sourceOffset = (firstFrame + frameIndex) * channels;
            for (let channel = 0; channel < channels; ++channel) {
                mono += Number(data[sourceOffset + channel]) || 0;
            }
            mono /= channels;
            real[frameIndex] = mono * window[frameIndex];
        }

        fft();
        configureBands(sampleRate);

        const coherentGain = used > 1 ? 4 / used : 1;
        const half = FFT_SIZE >> 1;
        for (let bin = 0; bin <= half; ++bin) {
            magnitudes[bin] = Math.hypot(real[bin], imag[bin]) * coherentGain;
        }

        for (let band = 0; band < bandCount; ++band) {
            let energy = 0;
            const bin0 = bandStart[band];
            const bin1 = bandEnd[band];

            for (let bin = bin0; bin < bin1; ++bin) {
                const magnitude = magnitudes[bin];
                energy += magnitude * magnitude;
            }

            const rms = Math.sqrt(energy / Math.max(1, bin1 - bin0));
            const db = 20 * Math.log10(Math.max(1e-12, rms));
            const level = Math.max(0, Math.min(1, (db + 72) / 72));
            targets[band] = Math.max(FLOOR_LEVEL, Math.min(0.98, level));
        }

        updateDynamics(dt, FLOOR_LEVEL);
    }

    function makeSpectrumFrame() {
        const length = bandCount * 2;
        if (!(outputFrame instanceof Float32Array) || outputFrame.length !== length) {
            outputFrame = new Float32Array(length);
        }

        const frame = outputFrame;
        for (let i = 0; i < bandCount; ++i) {
            const at = i * 2;
            frame[at] = smoothed[i] || FLOOR_LEVEL;
            frame[at + 1] = peaks[i] || FLOOR_LEVEL;
        }
        return frame;
    }

    let outputFrame = null;

    return {
        configure: function (count) {
            const nextCount = Math.max(1, count | 0);
            if (nextCount === bandCount) return;
            bandCount = nextCount;
            targets = new Float64Array(bandCount);
            smoothed = new Float64Array(bandCount);
            peaks = new Float64Array(bandCount);
            peakVelocity = new Float64Array(bandCount);
            peakHold = new Float64Array(bandCount);
            bandStart = new Int32Array(bandCount);
            bandEnd = new Int32Array(bandCount);
            bandSampleRate = 0;
            outputFrame = null;
        },

        setOutputFrame: function (frame) {
            const expectedLength = bandCount * 2;
            outputFrame = frame instanceof Float32Array && frame.length === expectedLength
                ? frame
                : null;
        },

        renderFrame: function (interval) {
            const dt = Math.max(0.001, Math.min(0.2, (interval > 0 ? interval : FRAME_TIME) / 1000));
            const audioStart = performance.now();
            let data = null;
            let sampleCount = 0;
            let channels = 0;
            let sampleRate = 0;
            let available = 0;

            if (typeof fb.GetAudioChunkTo === 'function') {
                available = fb.GetAudioChunkTo(pcm, 0.06, -0.03, chunkInfo);
                data = pcm;
                sampleCount = chunkInfo.SampleCount;
                channels = chunkInfo.ChannelCount;
                sampleRate = chunkInfo.SampleRate;
            } else {
                const chunk = fb.GetAudioChunk(0.06, -0.03);
                if (chunk) {
                    sampleCount = chunk.SampleCount;
                    channels = chunk.ChannelCount;
                    sampleRate = chunk.SampleRate;
                    const required = sampleCount * channels;
                    if (typeof chunk.CopyDataTo === 'function') {
                        if (pcm.length < required) pcm = new Float32Array(required);
                        available = chunk.CopyDataTo(pcm);
                        data = pcm;
                    } else {
                        data = chunk.Data;
                        available = data ? data.length : 0;
                    }
                }
            }
            const audioEnd = performance.now();

            analyse(data, sampleCount, channels, sampleRate, available, dt);
            const analysisEnd = performance.now();

            const frame = makeSpectrumFrame();
            const packEnd = performance.now();

            return {
                frame,
                timing: {
                    audio: audioEnd - audioStart,
                    analysis: analysisEnd - audioEnd,
                    pack: packEnd - analysisEnd,
                    total: packEnd - audioStart,
                    interval
                }
            };
        }
    };
}

function makeWorkerSource(currentFftSize, uncapped) {
    return String.raw`
'use strict';

const TARGET_FPS = ${TARGET_FPS};
const FRAME_TIME = 1000 / TARGET_FPS;
const UNCAPPED = ${uncapped};
const createSpectrumEngine = ${createSpectrumEngine.toString()};
const engine = createSpectrumEngine(${currentFftSize});

let configured = false;
let waitingForPanel = false;
let timerId = 0;
let lastFrameStart = 0;
let sequence = 0;
const frameMessage = { frame: null, sequence: 0, timing: null };

function scheduleNext() {
    if (!configured || waitingForPanel || timerId) return;
    const elapsed = performance.now() - lastFrameStart;
    const delay = UNCAPPED ? 0 : Math.max(0, FRAME_TIME - elapsed);

    timerId = setTimeout(function () {
        timerId = 0;
        produceFrame();
    }, delay);
}

function produceFrame() {
    if (!configured || waitingForPanel) return;

    const frameStart = performance.now();
    const interval = lastFrameStart ? frameStart - lastFrameStart : 0;
    lastFrameStart = frameStart;

    const result = engine.renderFrame(interval);
    const frame = result.frame;

    // Ownership of this ArrayBuffer moves to the panel. The Worker does not retain another
    // output buffer; the panel returns its previous displayed frame with the ACK after paint.
    engine.setOutputFrame(null);
    waitingForPanel = true;
    frameMessage.frame = frame;
    frameMessage.sequence = ++sequence;
    frameMessage.timing = result.timing;
    try {
        postMessage(frameMessage, [frame.buffer]);
    } finally {
        frameMessage.frame = null;
        frameMessage.timing = null;
    }
}

onmessage = function (event) {
    const message = event.data;

    if (message.type === 'config') {
        engine.configure(message.count);
        configured = true;
        scheduleNext();
        return;
    }

    if (message.type === 'next') {
        waitingForPanel = false;
        engine.setOutputFrame(message.frame || null);
        scheduleNext();
    }
};
`;
}

let worker = null;
let mainEngine = null;
let mainTimerId = 0;
let mainLastFrameStart = 0;
let mainSequence = 0;
let mainWaitingForPaint = false;
const workerNextMessage = { type: 'next', frame: null };

function resetCounters() {
    frame = null;
    frameReturn = null;
    frameNeedsAck = false;
    timing = { audio: 0, analysis: 0, pack: 0, total: 0, interval: 0 };
    frameSequence = 0;
    lastPaintedSequence = -1;
    frameFps = 0;
    paintFps = 0;
    frameCount = 0;
    paintCount = 0;
    frameWindowStart = performance.now();
    paintWindowStart = frameWindowStart;
}

function recordFrame(nextFrame, sequence, nextTiming) {
    const previousFrame = frame;
    frame = nextFrame instanceof Float32Array ? nextFrame : previousFrame;
    frameReturn = frame !== previousFrame ? previousFrame : null;
    frameNeedsAck = engineMode === 'worker';
    frameSequence = sequence;
    timing = nextTiming;

    ++frameCount;
    const now = performance.now();
    const elapsed = now - frameWindowStart;
    if (elapsed >= 500) {
        frameFps = frameCount * 1000 / elapsed;
        frameCount = 0;
        frameWindowStart = now;
    }

    window.Repaint();
}

function stopEngine() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    if (mainTimerId) {
        clearTimeout(mainTimerId);
        mainTimerId = 0;
    }
    mainEngine = null;
    mainLastFrameStart = 0;
    mainSequence = 0;
    mainWaitingForPaint = false;
}

function scheduleMain() {
    if (engineMode !== 'main' || !mainEngine || mainTimerId || mainWaitingForPaint) return;
    const elapsed = performance.now() - mainLastFrameStart;
    const delay = rateMode === 'max' ? 0 : Math.max(0, FRAME_TIME - elapsed);

    mainTimerId = setTimeout(function () {
        mainTimerId = 0;
        renderMainFrame();
    }, delay);
}

function renderMainFrame() {
    if (engineMode !== 'main' || !mainEngine) return;

    const frameStart = performance.now();
    const interval = mainLastFrameStart ? frameStart - mainLastFrameStart : 0;
    mainLastFrameStart = frameStart;

    const result = mainEngine.renderFrame(interval);
    mainWaitingForPaint = true;
    recordFrame(result.frame, ++mainSequence, result.timing);
}

function startEngine() {
    switchingRenderer = true;
    stopEngine();
    resetCounters();

    try {
        window.DrawMode = drawMode;
        INFO_FONT = gdi.Font('Segoe UI', 12);
    } finally {
        switchingRenderer = false;
    }

    if (engineMode === 'worker') {
        const currentWorker = new Worker(makeWorkerSource(fftSize, rateMode === 'max'), 'spectrum-analyzer');
        worker = currentWorker;

        currentWorker.onmessage = function (event) {
            if (worker !== currentWorker) return;
            recordFrame(event.data.frame, event.data.sequence, event.data.timing);
        };

        currentWorker.onerror = function (event) {
            if (worker === currentWorker) console.log(`Worker error: ${event.message}`);
        };
    } else {
        mainEngine = createSpectrumEngine(fftSize);
    }

    sendSize();
    window.Repaint();
}

function sendSize() {
    const width = Math.max(1, window.Width);
    const count = Math.max(1, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));

    if (engineMode === 'worker') {
        if (!worker) return;
        worker.postMessage({ type: 'config', count });
    } else {
        if (!mainEngine) return;
        mainEngine.configure(count);
        scheduleMain();
    }
}

function on_size() {
    sendSize();
}

const SETTINGS_Y = 42;
const SETTINGS_H = 24;
const ENGINE_MAIN = { x: 66, y: SETTINGS_Y, w: 50, h: SETTINGS_H };
const ENGINE_WORKER = { x: 120, y: SETTINGS_Y, w: 62, h: SETTINGS_H };
const RENDERER_GDI = { x: 272, y: SETTINGS_Y, w: 46, h: SETTINGS_H };
const RENDERER_D2D = { x: 322, y: SETTINGS_Y, w: 52, h: SETTINGS_H };
const FFT_1024 = { x: 426, y: SETTINGS_Y, w: 52, h: SETTINGS_H };
const FFT_2048 = { x: 482, y: SETTINGS_Y, w: 52, h: SETTINGS_H };
const FFT_4096 = { x: 538, y: SETTINGS_Y, w: 52, h: SETTINGS_H };
const RATE_120 = { x: 644, y: SETTINGS_Y, w: 46, h: SETTINGS_H };
const RATE_MAX = { x: 694, y: SETTINGS_Y, w: 46, h: SETTINGS_H };

function contains(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function drawChoice(gr, rect, text, selected) {
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h, selected ? 0xFF355D7A : 0xFF20262E);
    gr.DrawText(text, INFO_FONT, selected ? 0xFFFFFFFF : 0xFFB7C1CB,
        rect.x, rect.y, rect.w, rect.h, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

function on_mouse_lbtn_up(x, y) {
    let nextEngine = engineMode;
    let nextMode = drawMode;
    let nextFft = fftSize;
    let nextRate = rateMode;

    if (contains(ENGINE_MAIN, x, y)) nextEngine = 'main';
    else if (contains(ENGINE_WORKER, x, y)) nextEngine = 'worker';
    else if (contains(RENDERER_GDI, x, y)) nextMode = 0;
    else if (contains(RENDERER_D2D, x, y)) nextMode = 1;
    else if (contains(FFT_1024, x, y)) nextFft = 1024;
    else if (contains(FFT_2048, x, y)) nextFft = 2048;
    else if (contains(FFT_4096, x, y)) nextFft = 4096;
    else if (contains(RATE_120, x, y)) nextRate = '120';
    else if (contains(RATE_MAX, x, y)) nextRate = 'max';
    else return;

    if (nextEngine === engineMode && nextMode === drawMode && nextFft === fftSize && nextRate === rateMode) return;
    engineMode = nextEngine;
    drawMode = nextMode;
    fftSize = nextFft;
    rateMode = nextRate;
    startEngine();
}

function drawSpectrumFrame(gr, spectrumFrame) {
    if (!(spectrumFrame instanceof Float32Array) || spectrumFrame.length < 2) return;

    const width = Math.max(1, window.Width);
    const height = Math.max(1, window.Height);
    const plotTop = Math.min(Math.max(0, SPECTRUM_TOP), Math.max(0, height - 1));
    const marginBottom = Math.max(8, Math.round(height * 0.04));
    const plotBottom = Math.max(plotTop + 1, height - marginBottom);
    const usableHeight = Math.max(1, plotBottom - plotTop);
    const barWidth = Math.min(BAR_WIDTH, width);
    const count = spectrumFrame.length >> 1;
    const totalWidth = count * barWidth + (count - 1) * BAR_GAP;
    const firstX = Math.floor((width - totalWidth) * 0.5);

    for (let i = 0; i < count; ++i) {
        const x = firstX + i * (barWidth + BAR_GAP);
        const level = spectrumFrame[i * 2] || 0.04;
        const peak = spectrumFrame[i * 2 + 1] || 0.04;
        const barHeight = Math.max(1, level * usableHeight);
        const y = plotBottom - barHeight;

        gr.FillSolidRect(x, y, barWidth, barHeight, BAR_COLOUR);

        const peakY = plotBottom - peak * usableHeight;
        gr.DrawLine(x, peakY, x + barWidth - 1, peakY, 1, 0xFFE8EDF2);
    }
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, 0xFF101319);
    if (switchingRenderer) return;

    if (frame) {
        drawSpectrumFrame(gr, frame);

        if (frameSequence !== lastPaintedSequence) {
            lastPaintedSequence = frameSequence;
            ++paintCount;
            const now = performance.now();
            const elapsed = now - paintWindowStart;
            if (elapsed >= 500) {
                paintFps = paintCount * 1000 / elapsed;
                paintCount = 0;
                paintWindowStart = now;
            }

            if (engineMode === 'worker' && frameNeedsAck) {
                const returnFrame = frameReturn;
                frameReturn = null;
                frameNeedsAck = false;
                if (worker) {
                    workerNextMessage.frame = returnFrame || null;
                    try {
                        if (returnFrame && returnFrame.buffer) {
                            worker.postMessage(workerNextMessage, [returnFrame.buffer]);
                        } else {
                            worker.postMessage(workerNextMessage);
                        }
                    } finally {
                        workerNextMessage.frame = null;
                    }
                }
            } else if (engineMode === 'main' && mainWaitingForPaint) {
                mainWaitingForPaint = false;
                scheduleMain();
            }
        }
    }

    const engine = engineMode === 'worker' ? 'Worker' : 'Main';
    const backend = drawMode === 1 ? 'D2D' : 'GDI';
    const overlay = `${engine}/${backend}   frame ${frameFps.toFixed(1)} FPS   paint ${paintFps.toFixed(1)} FPS   interval ${timing.interval.toFixed(1)} ms   audio ${timing.audio.toFixed(2)}   FFT ${timing.analysis.toFixed(2)}   pack ${timing.pack.toFixed(2)}   total ${timing.total.toFixed(2)} ms`;
    gr.FillSolidRect(8, 8, Math.max(1, Math.min(window.Width - 16, 760)), 28, 0xC0101319);
    gr.DrawText(overlay, INFO_FONT, 0xFFE8EDF2, 14, 8, Math.max(1, window.Width - 28), 28,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);

    gr.DrawText('Engine:', INFO_FONT, 0xFFB7C1CB, 14, SETTINGS_Y, 50, SETTINGS_H,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, ENGINE_MAIN, 'Main', engineMode === 'main');
    drawChoice(gr, ENGINE_WORKER, 'Worker', engineMode === 'worker');

    gr.DrawText('Renderer:', INFO_FONT, 0xFFB7C1CB, 196, SETTINGS_Y, 74, SETTINGS_H,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, RENDERER_GDI, 'GDI', drawMode === 0);
    drawChoice(gr, RENDERER_D2D, 'D2D', drawMode === 1);

    gr.DrawText('FFT:', INFO_FONT, 0xFFB7C1CB, 388, SETTINGS_Y, 34, SETTINGS_H,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, FFT_1024, '1024', fftSize === 1024);
    drawChoice(gr, FFT_2048, '2048', fftSize === 2048);
    drawChoice(gr, FFT_4096, '4096', fftSize === 4096);

    gr.DrawText('Rate:', INFO_FONT, 0xFFB7C1CB, 604, SETTINGS_Y, 36, SETTINGS_H,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, RATE_120, '120', rateMode === '120');
    drawChoice(gr, RATE_MAX, 'Max', rateMode === 'max');

    gr.DrawText('Tip: for finer timer granularity, enable "Use high-resolution timers" in Advanced > Tools > JSplitter > Performance (restart required).',
        INFO_FONT, 0xFF7E8A96, 14, 68, Math.max(1, window.Width - 28), 18,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
}

startEngine();
