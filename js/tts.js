/* Latin text-to-speech.
   No living native speakers exist, so we use the best Latin voice the device offers;
   otherwise a natural Italian voice (closest phonology) and respell the Latin so the
   Italian engine produces Classical (restored) or Ecclesiastical pronunciation. */
(function () {
  const LS = window.localStorage;
  const get = (k, d) => { try { return LS.getItem(k) ?? d; } catch (e) { return d; } };
  const set = (k, v) => { try { LS.setItem(k, v); } catch (e) {} };

  const TTS = {
    voices: [], voice: null,
    style: get('lat_style', 'classical'),
    rate: parseFloat(get('lat_rate', '0.85')),
    supported: 'speechSynthesis' in window,
    listeners: [],

    rankVoice(v) {
      const lang = (v.lang || '').toLowerCase(), name = (v.name || '').toLowerCase();
      let s = 0;
      if (lang.startsWith('la')) s = 100;
      else if (lang.startsWith('it')) s = 60;
      else if (lang.startsWith('es')) s = 30;
      else return 0;
      if (/natural|neural|online|premium|enhanced|google/.test(name)) s += 25;
      if (/elsa|isabella|diego|giuseppe|federica|alice|luca|paola|emma/.test(name)) s += 5;
      if (v.localService === false) s += 3;
      return s;
    },
    loadVoices() {
      if (!this.supported) return;
      const all = speechSynthesis.getVoices();
      this.voices = all.filter(v => this.rankVoice(v) > 0).sort((a, b) => this.rankVoice(b) - this.rankVoice(a));
      const saved = get('lat_voice', '');
      this.voice = this.voices.find(v => v.name === saved) || this.voices[0] || null;
      this.listeners.forEach(f => f());
    },
    setVoice(name) { this.voice = this.voices.find(v => v.name === name) || this.voice; set('lat_voice', name); },
    setStyle(s) { this.style = s; set('lat_style', s); },
    setRate(r) { this.rate = r; set('lat_rate', String(r)); },

    /* Respell Latin for the speech engine */
    respell(text) {
      let t = text.normalize('NFC');
      const latinVoice = this.voice && (this.voice.lang || '').toLowerCase().startsWith('la');
      // remove editorial marks
      t = t.replace(/[\[\]{}<>†*_]/g, ' ').replace(/\s+/g, ' ');
      if (latinVoice) return t;
      // strip macrons/breves/diaeresis but keep base letters
      t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
      if (this.style === 'ecclesiastical') {
        return t.replace(/ae/g, 'e').replace(/oe/g, 'e').replace(/Ae/g, 'E').replace(/Oe/g, 'E')
                .replace(/j/g, 'i').replace(/J/g, 'I').replace(/y/g, 'i').replace(/ph/g, 'f').replace(/th/g, 't');
      }
      // ---- Classical (restored) pronunciation through an Italian voice ----
      return t.split(/(\s+|[.,;:!?'"()–—-]+)/).map(w => {
        if (!/[A-Za-z]/.test(w)) return w;
        const cap = /^[A-Z]/.test(w);
        let s = w.toLowerCase();
        s = s.replace(/ph/g, 'p').replace(/th/g, 't').replace(/ch/g, 'c').replace(/rh/g, 'r');
        s = s.replace(/y/g, 'i').replace(/j/g, 'i');
        s = s.replace(/ae/g, 'ai').replace(/oe/g, 'oi');           // diphthongs: "eye", "oy"
        s = s.replace(/^v(?=[aeiou])/g, 'u').replace(/([aeiou])v/g, '$1u').replace(/v/g, 'u'); // v = w
        s = s.replace(/gn/g, 'ngn');                                  // magnus = mang-nus
        s = s.replace(/c(?=[ei])/g, 'ch').replace(/g(?=[ei])/g, 'gh'); // hard c / g
        s = s.replace(/x/g, 'cs').replace(/cs(?=[ei])/g, 'chs');
        s = s.replace(/^h/, '');                                      // Italian ignores h anyway
        s = s.replace(/z/g, 'dz');
        return cap ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      }).join('');
    },

    speak(text, opts = {}) {
      if (!this.supported || !text) return;
      speechSynthesis.cancel();
      const chunks = String(text).split(/\n+/).filter(Boolean);
      chunks.forEach((c, i) => {
        const u = new SpeechSynthesisUtterance(this.respell(c));
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'it-IT';
        u.rate = (opts.slow ? 0.6 : 1) * this.rate;
        u.pitch = 1;
        if (opts.onend && i === chunks.length - 1) u.onend = opts.onend;
        speechSynthesis.speak(u);
      });
    },
    stop() { if (this.supported) speechSynthesis.cancel(); }
  };
  if (TTS.supported) {
    TTS.loadVoices();
    speechSynthesis.onvoiceschanged = () => TTS.loadVoices();
    setTimeout(() => TTS.loadVoices(), 600);
  }
  window.TTS = TTS;
})();
