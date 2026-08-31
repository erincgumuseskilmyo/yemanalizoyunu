# -*- coding: utf-8 -*-
"""Yumusak, dikissiz donen arka plan muzigi uretir.

Dort akorluk sakin bir dongu (16 s). Akor kuyruklari tampon sonundan basina
sarilarak yazildigi icin dongu noktasinda tiklama olmaz.
"""
import math, os, random, struct, wave

SR = 22050
BARS = 4
BAR = 4.0                      # saniye
N = int(SR * BARS * BAR)       # 16 s
OUT = "assets/audio/music_loop.wav"

# Nota -> frekans (A4 = 440)
NOTES = {
    "E2": 82.41, "F#2": 92.50, "A2": 110.00, "B2": 123.47, "D2": 73.42,
    "C#3": 138.59, "D3": 146.83, "E3": 164.81, "F#3": 185.00, "A3": 220.00,
    "G#3": 207.65, "B3": 246.94,
    "C#4": 277.18, "E4": 329.63, "F#4": 369.99, "G#4": 415.30, "A4": 440.00,
    "B4": 493.88, "C#5": 554.37, "E5": 659.26,
}

# Sicak, cozulmeye ihtiyac duymayan bir ilerleyis: Amaj7 - F#m7 - Dmaj7 - E6sus
CHORDS = [
    ["A2", "E3", "A3", "C#4", "E4", "G#4"],
    ["F#2", "C#3", "F#3", "A3", "C#4", "E4"],
    ["D2", "A2", "D3", "F#3", "A3", "C#4"],
    ["E2", "B2", "E3", "G#3", "B3", "C#4"],
]

# Ustte seyrek, yumusak birer damla: (bar, bar icindeki an, nota)
BELLS = [
    (0, 0.35, "E5"), (0, 2.10, "C#5"),
    (1, 0.80, "A4"),  (1, 2.60, "C#5"),
    (2, 0.25, "F#4"), (2, 1.90, "A4"),  (2, 3.20, "C#5"),
    (3, 1.10, "B4"),  (3, 2.80, "G#4"),
]


def add(buf, start, samples):
    """Tamponun sonunu basina sararak ekler — dongu dikissiz kalir."""
    for i, v in enumerate(samples):
        buf[(start + i) % N] += v


def pad_voice(freq, dur, amp):
    """Yavas acilip kapanan, hafif detune'lu yumusak ped sesi."""
    n = int(SR * dur)
    atk, rel = int(SR * 1.3), int(SR * 1.6)
    out = [0.0] * n
    # iki hafif kaydirilmis bilesen: hareketli, "koro" hissi veren doku
    for det, w in ((0.0, 1.0), (+0.13, 0.55), (-0.15, 0.5)):
        f = freq + det
        ph = random.uniform(0, math.tau)
        for i in range(n):
            t = i / SR
            s = (math.sin(2 * math.pi * f * t + ph)
                 + 0.16 * math.sin(2 * math.pi * 2 * f * t + ph))
            out[i] += s * w
    for i in range(n):
        if i < atk:
            e = (i / atk) ** 1.6
        elif i > n - rel:
            e = ((n - i) / rel) ** 1.4
        else:
            e = 1.0
        # cok yavas bir dalgalanma, sesin donuk kalmasini onler
        e *= 0.88 + 0.12 * math.sin(2 * math.pi * 0.07 * i / SR)
        out[i] *= e * amp
    return out


def bell(freq, amp):
    """Kisa, yumusak celesta benzeri damla."""
    dur = 2.6
    n = int(SR * dur)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        env = math.exp(-t * 2.4)
        s = (math.sin(2 * math.pi * freq * t)
             + 0.30 * math.sin(2 * math.pi * freq * 2 * t) * math.exp(-t * 4.5)
             + 0.12 * math.sin(2 * math.pi * freq * 3.01 * t) * math.exp(-t * 7))
        out[i] = s * env * amp
    return out


def lowpass(buf, k):
    """Tek kutuplu alcak geciren — dongusel calisir.

    Once tampon bastan sona yazmadan taranarak filtre durumu isitilir; boylece
    yazma gecisi dogru baslangic durumuyla baslar ve bittiginde ayni degere
    doner. Aksi hâlde dongu noktasinda duyulur bir tiklama olusur.
    """
    lp = 0.0
    for i in range(N):
        lp += k * (buf[i] - lp)
    for i in range(N):
        lp += k * (buf[i] - lp)
        buf[i] = lp


def echo(buf, delay_s, feedback, mix):
    """Dongusel gecikme: mekan hissi verir, sarmali oldugu icin donguyu bozmaz."""
    d = int(SR * delay_s)
    tail = buf[:]
    for _ in range(4):                       # dort yansima
        tail = [tail[(i - d) % N] * feedback for i in range(N)]
        for i in range(N):
            buf[i] += tail[i] * mix


if __name__ == "__main__":
    random.seed(11)
    buf = [0.0] * N

    for b, chord in enumerate(CHORDS):
        start = int(SR * b * BAR)
        for k, note in enumerate(chord):
            amp = 0.34 if k < 2 else 0.20     # bas notalar biraz one cikar
            add(buf, start, pad_voice(NOTES[note], BAR + 1.4, amp))

    for b, off, note in BELLS:
        add(buf, int(SR * (b * BAR + off)), bell(NOTES[note], 0.20))

    lowpass(buf, 0.16)
    echo(buf, 0.375, 0.45, 0.28)

    peak = max(abs(v) for v in buf) or 1.0
    data = b"".join(struct.pack("<h", int(max(-1, min(1, v / peak * 0.72)) * 32767))
                    for v in buf)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data)
    print(f"{OUT}: {N/SR:.1f} s, {os.path.getsize(OUT)//1024} KB")
