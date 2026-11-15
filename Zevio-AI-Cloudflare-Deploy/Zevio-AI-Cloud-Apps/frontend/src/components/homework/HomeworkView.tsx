import React, { useState, useRef, useEffect } from "react";
import {
  GraduationCap,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  BookA,
  Languages,
  Upload,
  FileText,
  X,
  Send,
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { HomeworkSubject, AcademicGrade } from "../../types";
import { streamHomeworkAPI } from "../../services/api";
import { MarkdownRenderer } from "../common/MarkdownRenderer";
import { useApp } from "../../context/AppContext";

export const HomeworkView: React.FC = () => {
  const { setIsStatusModalOpen, selectedModel } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<HomeworkSubject>("Mathematics");
  const [selectedGrade, setSelectedGrade] = useState<AcademicGrade>("Grade 12 (BacII Exam)");
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [isSolving, setIsSolving] = useState(false);
  const [solution, setSolution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);

  const subjects: Array<{
    id: HomeworkSubject;
    label: string;
    khmerLabel: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: "Mathematics",
      label: "Mathematics",
      khmerLabel: "គណិតវិទ្យា",
      icon: <Calculator className="w-4 h-4" />,
      color: "border-blue-500/50 text-blue-400 bg-blue-500/10"
    },
    {
      id: "Physics",
      label: "Physics",
      khmerLabel: "រូបវិទ្យា",
      icon: <Atom className="w-4 h-4" />,
      color: "border-violet-500/50 text-violet-400 bg-violet-500/10"
    },
    {
      id: "Chemistry",
      label: "Chemistry",
      khmerLabel: "គីមីវិទ្យា",
      icon: <FlaskConical className="w-4 h-4" />,
      color: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
    },
    {
      id: "Biology",
      label: "Biology",
      khmerLabel: "ជីវវិទ្យា",
      icon: <Dna className="w-4 h-4" />,
      color: "border-teal-500/50 text-teal-400 bg-teal-500/10"
    },
    {
      id: "English",
      label: "English",
      khmerLabel: "ភាសាអង់គ្លេស",
      icon: <BookA className="w-4 h-4" />,
      color: "border-amber-500/50 text-amber-400 bg-amber-500/10"
    },
    {
      id: "Khmer",
      label: "Khmer",
      khmerLabel: "ភាសាខ្មែរ",
      icon: <Languages className="w-4 h-4" />,
      color: "border-rose-500/50 text-rose-400 bg-rose-500/10"
    },
  ];

  const academicGrades: Array<{ value: AcademicGrade; label: string; khmer: string }> = [
    { value: "Grade 1-6 (Primary)", label: "Grade 1-6", khmer: "ថ្នាក់ទី ១-៦ (បឋម)" },
    { value: "Grade 7-9 (Lower Secondary)", label: "Grade 7-9", khmer: "ថ្នាក់ទី ៧-៩ (អនុ)" },
    { value: "Grade 10", label: "Grade 10", khmer: "វិទ្យាល័យ ថ្នាក់ទី ១០" },
    { value: "Grade 11", label: "Grade 11", khmer: "វិទ្យាល័យ ថ្នាក់ទី ១១" },
    { value: "Grade 12 (BacII Exam)", label: "Grade 12", khmer: "ថ្នាក់ទី ១២ (បាក់ឌុប)" },
    { value: "University (Undergraduate)", label: "University", khmer: "បរិញ្ញាបត្រ" },
    { value: "University (Advanced/Postgraduate)", label: "Postgrad", khmer: "ក្រោយបរិញ្ញាបត្រ" }
  ];

  const subjectQuickPrompts: Record<HomeworkSubject, string[]> = {
    Mathematics: [
      "ដោះស្រាយសមីការដឺក្រេទី ២: ax^2 + bx + c = 0",
      "គណនាអាំងតេក្រាលមិនកំណត់: \\int x e^{2x} dx",
      "រកតម្លៃ និងវ៉ិចទ័រផ្ទាល់ (Eigenvalues & Eigenvectors)",
      "ដោះស្រាយប្រព័ន្ធសមីការលីនេអ៊ែរ ២ ឬ ៣ អញ្ញាត"
    ],
    Physics: [
      "ដោះស្រាយលំហាត់ចលនាត្រង់ប្រែប្រួលស្មើ (Kinematics)",
      "គណនាដែនម៉ាញេទិចក្នុងប៊ូប៊ីន (Magnetic Field in Solenoid)",
      "ពន្យល់ច្បាប់ទីពីរទែរម៉ូឌីណាមិច (Second Law of Thermodynamics)",
      "គណនាចរន្តអគ្គិសនី និងតង់ស្យុងក្នុងសៀគ្វី R-L-C"
    ],
    Chemistry: [
      "ថ្លឹងសមីការគីមី និងគណនាម៉ាសម៉ូលេគុល (Balancing Equations)",
      "គណនា pH នៃសូលុយស្យុងអាស៊ីតអាសេទិច 0.05 M",
      "ពន្យល់ពីយន្តការប្រតិកម្មគីមី SN1 និង SN2",
      "គណនាកំហាប់សូលុយស្យុង និងកំហាប់ម៉ូល (Molarity & Molality)"
    ],
    Biology: [
      "ពន្យល់ពីដំណើរការសំយោគរស្មីរបស់រុក្ខជាតិ (Photosynthesis)",
      "ពន្យល់ពីដំណើរការចម្លងកូដ និងបកប្រែកូដ DNA (Transcription & Translation)",
      "ប្រៀបធៀបចំណែកកោសិកាមីតូស និងមេយ៉ូស (Mitosis vs Meiosis)",
      "ច្បាប់តំណពូជរបស់លោក ម៉ង់ដែល (Mendel's Laws of Genetics)"
    ],
    English: [
      "កែសម្រួលវេយ្យាករណ៍ និងពន្យល់កំហុស (Correct Grammar)",
      "សរសេរកថាខណ្ឌតែងសេចក្តី IELTS Academic Task 2",
      "បកប្រែអត្ថបទស្មុគស្មាញពី អង់គ្លេស ទៅ ខ្មែរ (EN to KH Translation)",
      "ពន្យល់ក្បួនប្រើ Tenses ទាំង ១២ ក្នុងភាសាអង់គ្លេស"
    ],
    Khmer: [
      "វិភាគអត្ថន័យ និងទម្រង់តែងសេចក្តីបែបពន្យល់ ឬពិភាក្សា",
      "ពន្យល់ពីក្បួនវេយ្យាករណ៍ខ្មែរ៖ កន្សោមនាម និងកន្សោមកិរិយា",
      "រៀបរាប់ពីចរិតលក្ខណៈតួអង្គ និងតម្លៃអប់រំក្នុងរឿងទុំទាវ",
      "វិភាគកំណាព្យខ្មែរ និងក្បួនកាព្យ (បទពាក្យ ៧ និង ពាក្យ ៨)"
    ]
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scrollToSolution = () => {
    setTimeout(() => {
      solutionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSolve = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() && !file) return;

    setIsSolving(true);
    setSolution("");
    setError(null);

    // Auto scroll down to answer area
    scrollToSolution();

    const formData = new FormData();
    if (question.trim()) {
      formData.append("question", question.trim());
      formData.append("prompt", question.trim());
    }
    formData.append("subject", selectedSubject);
    formData.append("grade", selectedGrade);
    formData.append("gradeLevel", selectedGrade);
    if (file) formData.append("file", file);

    let accumulated = "";

    await streamHomeworkAPI({
      formData,
      onChunk: (chunk: string) => {
        accumulated += chunk;
        setSolution(accumulated);
      },
      onDone: () => {
        setIsSolving(false);
      },
      onError: (err: string) => {
        setError(err);
        setIsSolving(false);
      }
    });
  };

  const handleCopySolution = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full max-w-full min-w-0 h-full overflow-y-auto overflow-x-hidden bg-slate-950 p-2.5 sm:p-5 md:p-8 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] md:pb-48 scroll-smooth"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
    >
      <div className="max-w-4xl mx-auto space-y-3.5 sm:space-y-5 w-full min-w-0">
        {/* Compact Header for Mobile & Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-slate-800/80 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 leading-tight truncate">
                Zevio Homework Solver
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Step-by-step academic solver with KaTeX LaTeX formulas
              </p>
            </div>
          </div>

          {/* Academic Level Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-300 font-semibold whitespace-nowrap flex-shrink-0">
              កម្រិតសិក្សា (Level):
            </span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as AcademicGrade)}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium flex-1 sm:flex-none sm:w-auto max-w-[210px] sm:max-w-xs truncate shadow-sm transition"
            >
              {academicGrades.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.khmer} — {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject Selection - Khmer and English for all options */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <label className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>ជ្រើសរើសមុខវិជ្ជា</span>
              <span className="text-slate-500 font-normal">/ SELECT SUBJECT:</span>
            </label>
            <span className="text-xs text-indigo-400 font-semibold hidden sm:inline">
              {subjects.find(s => s.id === selectedSubject)?.khmerLabel} ({selectedSubject})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full">
            {subjects.map((sub) => {
              const isSelected = selectedSubject === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubject(sub.id)}
                  className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all text-center group min-w-0 min-h-[64px] sm:min-h-[72px] ${
                    isSelected
                      ? `${sub.color} shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/60 bg-slate-900`
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 w-full">
                    <span className="flex-shrink-0">{sub.icon}</span>
                    <span className="font-bold text-xs sm:text-[13px] text-slate-100 leading-tight truncate">
                      {sub.khmerLabel}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 group-hover:text-slate-300 font-medium truncate w-full">
                    {sub.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Input Card & Upload */}
        <form onSubmit={handleSolve} className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-xl w-full overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <label className="text-[11px] sm:text-xs font-bold text-slate-200 truncate">
                ប្រធានលំហាត់ ឬ សំណួរ <span className="text-slate-400 font-normal hidden xs:inline">/ Problem:</span>
              </label>
              <span className="text-[9px] sm:text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                គាំទ្រអក្សរខ្មែរ &amp; Math
              </span>
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`សូមវាយបញ្ចូលប្រធានលំហាត់មុខវិជ្ជា ${subjects.find(s => s.id === selectedSubject)?.khmerLabel || selectedSubject} នៅទីនេះ (ជាភាសាខ្មែរ ឬអង់គ្លេស) ឬភ្ជាប់រូបភាពខាងក្រោម...`}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 font-sans leading-relaxed resize-y"
            />
          </div>

          {/* Quick Examples - Horizontal Scroll on Phone */}
          <div className="w-full min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] w-full min-w-0">
              <span className="text-indigo-400 font-semibold flex items-center gap-1 flex-shrink-0 text-[10px]">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                ឧទាហរណ៍:
              </span>
              {subjectQuickPrompts[selectedSubject].map((qp, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setQuestion(qp)}
                  className="flex-shrink-0 text-[10px] sm:text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60 transition whitespace-nowrap"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Compact File Upload Dropzone (Image / PDF) */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-800 hover:border-indigo-500/60 rounded-lg p-2.5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition flex-shrink-0" />
                <span className="text-[11px] text-slate-300 group-hover:text-slate-100">
                  បញ្ចូលរូបភាពលំហាត់ គំនូសបំព្រួញ ឬឯកសារ PDF <span className="text-[10px] text-slate-500">(Upload Photo / PDF)</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  {filePreview ? (
                    <img src={filePreview} alt="Homework preview" className="w-8 h-8 object-cover rounded border border-slate-800 flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded transition flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 gap-2">
            <span className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">ម៉ូឌែលសកម្ម (Active Model):</span>
              <span className="font-mono text-indigo-400 font-semibold">{selectedModel}</span>
            </span>
            <button
              type="submit"
              disabled={(!question.trim() && !file) || isSolving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 disabled:opacity-40 disabled:hover:bg-indigo-600"
            >
              {isSolving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>កំពុងដោះស្រាយលម្អិត... (Solving...)</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>ដោះស្រាយលំហាត់ (Solve Problem)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-start justify-between gap-3 shadow-lg animate-fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-200">មានបញ្ហាក្នុងការដោះស្រាយ (Solving Error)</p>
                <p className="leading-relaxed text-[11px] text-rose-300 break-words">{error}</p>
                <p className="text-[10px] text-slate-400 pt-1">
                  ប្រសិនបើប្រព័ន្ធ Cloud AI ពេញកូតា សូមរង់ចាំមួយរយៈ ឬប្តូរម៉ូឌែលនៅក្នុង Navigation Bar ខាងលើ។
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-2.5 py-1 bg-rose-900/50 hover:bg-rose-900/70 border border-rose-700 text-rose-100 rounded-lg text-[10px] font-semibold flex-shrink-0 transition"
            >
              AI Status
            </button>
          </div>
        )}

        {/* Solution Output Card */}
        {(solution || isSolving) && (
          <div
            ref={solutionRef}
            id="solutionCard"
            className="bg-slate-900 border border-indigo-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                  ដំណោះស្រាយ និងការពន្យល់លម្អិត (Step-by-Step Solution)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="p-1 sm:px-2 sm:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition flex items-center gap-1"
                  title="Back to question"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span className="hidden sm:inline">Top</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySolution}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">បានចម្លង</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>ចម្លង (Copy)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="prose-dark pt-1 leading-relaxed text-xs sm:text-sm overflow-x-auto">
              {solution ? (
                <MarkdownRenderer content={solution} />
              ) : (
                <div className="flex items-center gap-2 py-6 text-xs text-slate-400 justify-center">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>កំពុងវិភាគ និងគណនាដំណោះស្រាយលម្អិតជាភាសាខ្មែរ...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Jump-to-Answer Button for Mobile with safe area cushion */}
      {(solution || isSolving) && (
        <button
          type="button"
          onClick={scrollToSolution}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 sm:hidden flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full shadow-2xl shadow-indigo-500/50 border border-indigo-400/30 transition-all active:scale-95"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>មើលចម្លើយ (View Answer)</span>
        </button>
      )}
    </div>
  );
};
