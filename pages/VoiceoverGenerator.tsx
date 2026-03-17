
import React, { useEffect, useRef, useState } from 'react';
import { generateSpeech } from '../geminiService';

const VOICES = [
  { id: 'Kore', name: 'Kore (နူးညံ့သော အမျိုးသမီးသံ)', gender: 'Female' },
  { id: 'Zephyr', name: 'Zephyr (အသံဩဇာရှိသော အမျိုးသားသံ)', gender: 'Male' },
  { id: 'Puck', name: 'Puck (တက်ကြွသော အသံ)', gender: 'Neutral' },
  { id: 'Charon', name: 'Charon (တည်ငြိမ်သော အသံ)', gender: 'Male' },
  { id: 'Fenrir', name: 'Fenrir (နက်ရှိုင်းသော အသံ)', gender: 'Male' },
] as const;

type Voice = typeof VOICES[number];

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const pcmToWavBlob = (pcmData: Uint8Array, sampleRate: number): Blob => {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, pcmData.length, true);

  return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
};

const VoiceoverGenerator: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [downloadExtension, setDownloadExtension] = useState<'wav' | 'mp3'>('wav');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const savedScript = localStorage.getItem('wyp_tts_script');
    if (savedScript) {
      setText(savedScript);
      localStorage.removeItem('wyp_tts_script');
    }
  }, []);

  useEffect(() => () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const handleGenerate = async () => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    try {
      const { audioData, mimeType } = await generateSpeech(text, selectedVoice.id);
      const audioBytes = base64ToUint8Array(audioData);
      const sampleRate = Number(mimeType.match(/rate=(\d+)/)?.[1] || 24000);
      const isRawPcm = mimeType.startsWith('audio/L16');
      const blob = isRawPcm
        ? pcmToWavBlob(audioBytes, sampleRate)
        : new Blob([audioBytes], { type: mimeType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setDownloadExtension(isRawPcm ? 'wav' : 'mp3');
      setAudioUrl(url);
    } catch (error: any) {
      console.error("TTS Error:", error);
      const errorMsg = error.message || "အသံဖိုင် ထုတ်ယူရာတွင် အခက်အခဲရှိနေပါသည်။";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voiceover_${Date.now()}.${downloadExtension}`;
    a.click();
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
            🎙️
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Voiceover Generator</h2>
            <p className="text-slate-400">စာသားများကို Reels အတွက် Professional အသံဖိုင်များအဖြစ် ပြောင်းလဲပါ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
                စာသားရိုက်ထည့်ပါ
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Reels အတွက် Voiceover လုပ်ချင်သည့် စာသားများကို ဤနေရာတွင် ရိုက်ထည့်ပါ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white focus:outline-none focus:border-amber-500 min-h-[200px] burmese-text resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
                အသံအမျိုးအစား ရွေးချယ်ပါ
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      selectedVoice.id === voice.id
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-sm">{voice.name}</p>
                    <p className={`text-[10px] ${selectedVoice.id === voice.id ? 'text-slate-900' : 'text-slate-600'}`}>
                      {voice.gender} Voice
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Generating Voice...</span>
                </>
              ) : (
                <>
                  <span>🎙️</span>
                  <span>အသံဖိုင် ထုတ်ယူမည်</span>
                </>
              )}
            </button>
          </div>

          {/* Preview Section */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-6">
            {!audioUrl && !isLoading ? (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-4xl mx-auto opacity-50">
                  🎧
                </div>
                <p className="text-slate-500 max-w-[250px] mx-auto">
                  စာသားရိုက်ထည့်ပြီး Generate လုပ်ပါက ဤနေရာတွင် အသံဖိုင်ကို နားထောင်နိုင်ပါမည်
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-6 w-full">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-amber-500 rounded-full animate-pulse" 
                      style={{ height: `${Math.random() * 40 + 20}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <p className="text-amber-500 font-bold animate-pulse">AI is speaking...</p>
              </div>
            ) : (
              <div className="w-full space-y-8">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center text-4xl mx-auto text-amber-500 animate-bounce">
                  🔊
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold">အသံဖိုင် အဆင်သင့်ဖြစ်ပါပြီ</h3>
                  <p className="text-slate-400 text-sm">Reels မှာ အသုံးပြုရန် Download ဆွဲနိုင်ပါပြီ</p>
                </div>
                
                <audio ref={audioRef} src={audioUrl!} controls className="w-full" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => audioRef.current?.play()}
                    className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <span>▶️</span> Play Again
                  </button>
                  <button
                    onClick={downloadAudio}
                    className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📥</span> Download Audio
                  </button>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left">
                  <p className="text-amber-500 text-xs font-bold mb-2 flex items-center gap-2">
                    <span>💡</span> Pro Tip for Reels:
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Download ဆွဲထားသော အသံဖိုင်ကို CapCut တွင် ထည့်သွင်းပါ။ ထို့နောက် Reels တင်သည့်အခါ Instagram ရှိ Trending Music တစ်ခုကို ရွေးပြီး Volume ကို 0% ထားပါ။ ဤနည်းဖြင့် Trending Music Reach ကိုလည်း ရရှိပြီး AI Voiceover ကိုလည်း အသုံးပြုနိုင်မည် ဖြစ်ပါသည်။
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceoverGenerator;
