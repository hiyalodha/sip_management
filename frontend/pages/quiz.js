import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { isAuthenticated } from '../utils/auth';

// Each option's value is 0 (cautious) / 1 (balanced) / 2 (adventurous).
// Summed across all questions, the total maps to a risk profile.
const QUESTIONS = [
  {
    question: 'How long can this money stay invested before you need it back?',
    options: [
      { label: 'Less than 6 months', value: 0 },
      { label: '6 months to 2 years', value: 1 },
      { label: '2+ years', value: 2 }
    ]
  },
  {
    question: "If your investment dropped 15% in a month, what's your first instinct?",
    options: [
      { label: 'Pull it out before it drops further', value: 0 },
      { label: 'Wait and watch what happens', value: 1 },
      { label: "It's a discount — maybe invest more", value: 2 }
    ]
  },
  {
    question: 'How much investing experience do you have?',
    options: [
      { label: "None — this would be my first time", value: 0 },
      { label: "Some — I've dabbled a bit", value: 1 },
      { label: 'I follow the markets fairly closely', value: 2 }
    ]
  },
  {
    question: "What's this money actually for?",
    options: [
      { label: 'An emergency fund / near-term expense', value: 0 },
      { label: 'A mid-term goal (laptop, trip, course)', value: 1 },
      { label: 'Long-term wealth building', value: 2 }
    ]
  },
  {
    question: 'Checking your portfolio and seeing it down 10% today makes you feel...',
    options: [
      { label: 'Pretty stressed, honestly', value: 0 },
      { label: 'A little uneasy but okay', value: 1 },
      { label: 'Fine — markets go up and down', value: 2 }
    ]
  }
];

function getRiskProfile(score) {
  if (score <= 3) {
    return {
      level: 'Low',
      title: 'Cautious Investor',
      emoji: '🛡️',
      color: 'emerald',
      description:
        "You'd rather grow money slowly and steadily than risk losing it. Stick to Low-risk stocks — steadier, less dramatic swings."
    };
  }
  if (score <= 6) {
    return {
      level: 'Medium',
      title: 'Balanced Investor',
      emoji: '⚖️',
      color: 'amber',
      description:
        "You're okay with some ups and downs if it means better long-term growth. Medium-risk stocks fit that middle ground."
    };
  }
  return {
    level: 'High',
    title: 'Adventurous Investor',
    emoji: '🚀',
    color: 'violet',
    description:
      "You're playing the long game and can stomach volatility for the shot at bigger gains. High-risk stocks suit your appetite."
  };
}

const COLOR_STYLES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
};

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    api.get('/stocks')
      .then((res) => setStocks(res.data.stocks))
      .catch(() => {})
      .finally(() => setLoadingStocks(false));
  }, [router]);

  const finished = step >= QUESTIONS.length;
  const score = answers.reduce((sum, v) => sum + v, 0);
  const profile = finished ? getRiskProfile(score) : null;
  const recommended = profile
    ? stocks.filter((s) => s.Risk_Level === profile.level).slice(0, 6)
    : [];

  function handleAnswer(value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
    setStep((s) => s + 1);
  }

  function handleRetake() {
    setAnswers([]);
    setStep(0);
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Risk Quiz · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">What's Your Investing Style?</h1>
          <p className="text-ink-500 mt-1">Answer 5 quick questions and we'll match you with stocks that fit your risk appetite.</p>
        </div>

        {!finished ? (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-primary-600' : i === step ? 'bg-primary-300' : 'bg-ink-100'}`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-primary-600 mb-2">Question {step + 1} of {QUESTIONS.length}</p>
            <h2 className="text-lg font-bold text-ink-900 mb-5">{QUESTIONS[step].question}</h2>
            <div className="space-y-3">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left px-4 py-3.5 rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50 text-sm font-medium text-ink-700 hover:text-primary-800 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="mt-5 text-xs font-semibold text-ink-400 hover:text-ink-600"
              >
                ← Back
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-card-lg border border-ink-200 p-8 text-center">
              <p className="text-5xl mb-3">{profile.emoji}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${COLOR_STYLES[profile.color]}`}>
                {profile.level} Risk Profile
              </span>
              <h2 className="text-2xl font-extrabold text-ink-900">{profile.title}</h2>
              <p className="text-ink-500 mt-2 max-w-md mx-auto">{profile.description}</p>
              <button
                onClick={handleRetake}
                className="mt-5 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Retake quiz
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
              <h3 className="text-lg font-bold text-ink-900 mb-4">Stocks that match your profile</h3>
              {loadingStocks ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-ink-100 animate-pulse" />
                  ))}
                </div>
              ) : recommended.length === 0 ? (
                <p className="text-sm text-ink-400">No matching stocks found right now — check back later.</p>
              ) : (
                <div className="space-y-3">
                  {recommended.map((s) => (
                    <div
                      key={s.Stock_ID}
                      className="flex items-center justify-between border border-ink-100 rounded-xl px-4 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {s.Stock_Name} <span className="text-ink-400 font-normal">({s.Ticker_Symbol})</span>
                        </p>
                        <p className="text-xs text-ink-400">
                          {s.Sector} · ₹{Number(s.Current_Price).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        href={`/sip?stockId=${s.Stock_ID}`}
                        className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-card transition-colors"
                      >
                        Start a SIP
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-ink-400 mt-4">
                This quiz is a simple guide, not financial advice — it's here to help you get started, not to replace your own judgement.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
