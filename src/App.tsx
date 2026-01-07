import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Plus, Users, Wallet, Search, Calendar, MessageSquare, BarChart3, Send, TrendingUp, Download, Trash2, Lock, ShieldCheck, Key, GraduationCap, LogOut, EyeOff, IndianRupee, ArrowUpRight } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  className: string;
  teacherName: string;
  feeAmount: number;
  phone: string;
  paidMonths: string[];
  attendanceHistory: { [date: string]: 'present' | 'absent' | 'none' | string };
}

export default function App() {
  // --- 1. STATES ---
  const [userRole, setUserRole] = useState<'developer' | 'owner' | 'teacher' | 'none'>('none');
  const [view, setView] = useState<'students' | 'finance' | 'analytics' | 'admin'>('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  
  const MASTER_PIN = "1234"; 
  const TEACHER_PIN = "5555";
  const DEV_PIN = "0000"; 
  const MY_PHONE = "918287282426";
  
  const [logoClicks, setLogoClicks] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(true); 

  // --- 2. PERSISTENCE ---
  const [expiryDate, setExpiryDate] = useState(() => {
    const saved = localStorage.getItem('grower_expiry_v1');
    if (!saved) {
      const trial = new Date();
      trial.setDate(trial.getDate() + 7);
      return trial.toISOString().split('T')[0];
    }
    return saved;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('grower_master_v12');
    return saved ? JSON.parse(saved) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newFee, setNewFee] = useState("");

  useEffect(() => {
    localStorage.setItem('grower_master_v12', JSON.stringify(students));
    localStorage.setItem('grower_expiry_v1', expiryDate);
  }, [students, expiryDate]);

  const isExpired = new Date() > new Date(expiryDate);

  // --- 3. HELPER FUNCTIONS ---
  const handleLogoClick = () => {
    setLogoClicks(prev => prev + 1);
    if (logoClicks + 1 === 3) { setShowPinModal(true); setLogoClicks(0); }
    setTimeout(() => setLogoClicks(0), 2000);
  };

  const verifyPin = () => {
    if (pinInput === DEV_PIN) { setUserRole('developer'); setView('admin'); }
    else if (pinInput === MASTER_PIN) { setUserRole('owner'); setView('students'); }
    else if (pinInput === TEACHER_PIN) { setUserRole('teacher'); setView('students'); }
    else { alert("Incorrect PIN"); setPinInput(""); return; }
    setShowPinModal(false); setPinInput("");
  };

  const logout = () => { setUserRole('none'); setShowPinModal(true); };

  const addStudent = () => {
    if (!newName || !newPhone || !newClass || !newFee) return;
    const newStudent: Student = {
      id: Date.now(), name: newName, className: newClass,
      teacherName: newTeacher || "Main Staff", feeAmount: Number(newFee),
      phone: newPhone, paidMonths: [], attendanceHistory: {}
    };
    setStudents([...students, newStudent]);
    setNewName(""); setNewPhone(""); setNewClass(""); setNewTeacher(""); setNewFee("");
    setShowForm(false);
  };

  const markAttendance = (id: number, status: 'present' | 'absent') => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        const current = s.attendanceHistory[selectedDate];
        return { ...s, attendanceHistory: { ...s.attendanceHistory, [selectedDate]: current === status ? 'none' : status }};
      }
      return s;
    }));
  };

  const deleteStudent = (id: number) => {
    if(window.confirm("Delete record permanently?")) setStudents(students.filter(s => s.id !== id));
  };

  // --- 4. CALCULATIONS & PERFORMANCE ---
  const currentMonthKey = selectedDate.substring(0, 7);
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "All" || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  const feesCollected = filteredStudents.filter(s => s.paidMonths.includes(currentMonthKey)).reduce((acc, s) => acc + s.feeAmount, 0);
  const feesPending = filteredStudents.filter(s => !s.paidMonths.includes(currentMonthKey)).reduce((acc, s) => acc + s.feeAmount, 0);
  const absentees = filteredStudents.filter(s => s.attendanceHistory[selectedDate] === 'absent');

  const getWeeklyAttendanceTrend = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayStudents = students.filter(s => selectedClass === "All" || s.className === selectedClass);
      const presentCount = dayStudents.filter(s => s.attendanceHistory[date] === 'present').length;
      const total = dayStudents.length || 1;
      return { date, percentage: Math.round((presentCount / total) * 100) };
    });
  };

  const attendanceTrend = getWeeklyAttendanceTrend();
  const avgAttendance = Math.round(attendanceTrend.reduce((acc, curr) => acc + curr.percentage, 0) / 7);

  const getMonthlyHistory = () => {
    const history: { [key: string]: number } = {};
    students.forEach(s => s.paidMonths.forEach(m => { history[m] = (history[m] || 0) + s.feeAmount; }));
    return Object.entries(history).sort().reverse();
  };

  const exportToCSV = () => {
    const headers = "Name,Phone,Class,Teacher,Fee,Status\n";
    const rows = students.map(s => `${s.name},${s.phone},${s.className},${s.teacherName},${s.feeAmount},${s.paidMonths.includes(currentMonthKey)?'Paid':'Unpaid'}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Grower_Report.csv`; a.click();
  };

  // --- 5. UI COMPONENTS ---
  if (isExpired && userRole !== 'developer') {
    return (
      <div className="max-w-md mx-auto h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center text-white">
        <Lock size={64} className="text-rose-500 mb-6" />
        <h1 onClick={handleLogoClick} className="text-3xl font-black italic tracking-tighter mb-2 cursor-pointer">GROWER</h1>
        <p className="text-slate-400 text-sm mb-8">Trial Expired. Please contact for renewal.</p>
        <button onClick={() => window.open(`https://wa.me/${MY_PHONE}`, '_blank')} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pay & Renew</button>
        {showPinModal && (
          <div className="fixed inset-0 bg-white text-slate-900 flex flex-col items-center justify-center p-6 z-[100]">
            <input type="password" placeholder="ADMIN PIN" className="w-full bg-slate-100 p-4 rounded-xl text-center text-xl font-bold mb-4 outline-none border-2 border-indigo-600" value={pinInput} onChange={(e) => setPinInput(e.target.value)} autoFocus />
            <button onClick={verifyPin} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Verify</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-32 font-sans text-slate-900 border-x border-slate-100">
      
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-xs shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <h1 onClick={handleLogoClick} className="text-2xl font-black italic mb-6 text-slate-800 tracking-tighter">GROWER</h1>
            <input type="password" placeholder="Enter PIN" className="w-full bg-slate-100 p-4 rounded-2xl text-center text-lg font-bold outline-none mb-4 border-2 border-transparent focus:border-indigo-600 transition-all" value={pinInput} onChange={(e) => setPinInput(e.target.value)} autoFocus />
            <button onClick={verifyPin} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">Unlock App</button>
          </div>
        </div>
      )}

      {userRole !== 'developer' && (
        <header className="bg-indigo-600 text-white p-6 rounded-b-[3.5rem] shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h1 onClick={handleLogoClick} className="text-2xl font-black italic tracking-tighter cursor-pointer">GROWER</h1>
            <button onClick={logout} className="p-2 bg-white/10 rounded-full"><LogOut size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-4 border border-white/20">
              <p className="text-[9px] font-black uppercase text-indigo-100 mb-1">Collections</p>
              <p className="text-xl font-bold">₹{userRole === 'teacher' ? '---' : feesCollected}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-4 border border-white/20">
              <p className="text-[9px] font-black uppercase text-indigo-100 mb-1">Pending</p>
              <p className="text-xl font-bold text-rose-300">₹{userRole === 'teacher' ? '---' : feesPending}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center bg-white/10 rounded-2xl py-2">
            <Calendar size={12} className="mr-2 opacity-60"/>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none text-white uppercase" />
          </div>
        </header>
      )}

      <main className="p-4">
        {userRole === 'developer' && (
          <div className="space-y-6 text-center py-10 animate-in fade-in duration-500">
            <div className="bg-indigo-100 p-8 rounded-full inline-block mb-4"><EyeOff size={48} className="text-indigo-600" /></div>
            <h2 className="text-xl font-black">Developer Privacy Mode</h2>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-indigo-600">
              <label className="text-[10px] font-black uppercase text-indigo-600 mb-2 block">Set License Expiry</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-center border mb-6" />
              <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">Save & Logout</button>
            </div>
          </div>
        )}

        {userRole !== 'developer' && userRole !== 'none' && (
          <>
            {view === 'analytics' && userRole === 'owner' ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* PERFORMANCE CARDS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="bg-emerald-100 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-emerald-600"><TrendingUp size={20}/></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Avg Attendance</p>
                    <p className="text-2xl font-black text-slate-800">{avgAttendance}%</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-indigo-600"><IndianRupee size={20}/></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Recovery Rate</p>
                    <p className="text-2xl font-black text-slate-800">{Math.round((feesCollected / (feesCollected + feesPending || 1)) * 100)}%</p>
                  </div>
                </div>

                {/* VISUAL CHART */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">7-Day Attendance Trend</h3>
                  <div className="flex items-end justify-between h-32 gap-2">
                    {attendanceTrend.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full bg-indigo-100 rounded-t-lg transition-all duration-500 relative" style={{ height: `${day.percentage}%`, minHeight: '4px' }}>
                           {day.percentage > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100">{day.percentage}%</div>}
                        </div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase">{day.date.split('-')[2]}/{day.date.split('-')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
                  <h2 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm"><MessageSquare size={18}/> Absentees Today</h2>
                  {absentees.length > 0 ? absentees.map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2">
                      <span className="text-xs font-bold text-slate-700">{s.name}</span>
                      <button onClick={() => window.open(`https://wa.me/${s.phone}?text=Hello, your ward ${s.name} was absent today.`, '_blank')} className="bg-emerald-500 text-white p-2 rounded-xl shadow-lg"><Send size={14}/></button>
                    </div>
                  )) : <p className="text-xs text-indigo-400 italic text-center py-2">Full attendance! No messages needed.</p>}
                </div>

                <button onClick={exportToCSV} className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"><Download size={20}/> Download Full Report</button>
              </div>
            ) : view === 'finance' && userRole === 'owner' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-[2.5rem] border border-amber-100 mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Uncollected Fees</p>
                      <p className="text-2xl font-black text-amber-600">₹{feesPending}</p>
                    </div>
                    <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-700"><ArrowUpRight size={24}/></div>
                 </div>
                 {filteredStudents.map(s => {
                   const isPaid = s.paidMonths.includes(currentMonthKey);
                   return (
                    <div key={s.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Class {s.className} • ₹{s.feeAmount}</p>
                      </div>
                      <button onClick={() => {
                        const newPaid = isPaid ? s.paidMonths.filter(m => m !== currentMonthKey) : [...s.paidMonths, currentMonthKey];
                        setStudents(students.map(item => item.id === s.id ? {...item, paidMonths: newPaid} : item));
                      }} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-amber-100 text-amber-600'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </button>
                    </div>
                   )
                 })}
              </div>
            ) : view === 'students' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                  {["All", ...new Set(students.map(s => s.className))].map(cls => (
                    <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedClass === cls ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{cls}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center px-4 py-3 border border-slate-100">
                    <Search className="text-slate-400 mr-2" size={18} />
                    <input className="text-sm outline-none w-full bg-transparent font-medium" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  {userRole === 'owner' && (
                    <button onClick={() => setShowForm(!showForm)} className={`p-4 rounded-2xl shadow-lg transition-all ${showForm ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      {showForm ? <XCircle size={20}/> : <Plus size={20}/>}
                    </button>
                  )}
                </div>
                {showForm && (
                  <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border-t-4 border-indigo-600 space-y-3 animate-in slide-in-from-top-4">
                    <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Full Student Name" value={newName} onChange={e => setNewName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Class (e.g. 10th)" value={newClass} onChange={e => setNewClass(e.target.value)} />
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="WhatsApp Number" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Assigned Teacher" value={newTeacher} onChange={e => setNewTeacher(e.target.value)} />
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Fee Amount" type="number" value={newFee} onChange={e => setNewFee(e.target.value)} />
                    </div>
                    <button onClick={addStudent} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Confirm Registration</button>
                  </div>
                )}
                <div className="space-y-3">
                  {filteredStudents.map((s) => {
                    const status = s.attendanceHistory[selectedDate] || 'none';
                    return (
                      <div key={s.id} className={`p-5 rounded-[2.5rem] border-2 transition-all duration-300 ${status === 'present' ? 'bg-emerald-50 border-emerald-400' : status === 'absent' ? 'bg-rose-50 border-rose-400' : 'bg-white border-transparent shadow-sm'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="font-black text-slate-800 text-sm block tracking-tight">{s.name}</span>
                            <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">{s.className} • Teacher: {s.teacherName}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => markAttendance(s.id, 'present')} className={`p-3 rounded-2xl transition-all ${status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={24} /></button>
                            <button onClick={() => markAttendance(s.id, 'absent')} className={`p-3 rounded-2xl transition-all ${status === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-300'}`}><XCircle size={24} /></button>
                            {userRole === 'owner' && <button onClick={() => deleteStudent(s.id)} className="ml-1 text-slate-200 hover:text-rose-400"><Trash2 size={14} /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {userRole !== 'developer' && userRole !== 'none' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl flex justify-between border border-white/50 z-50 animate-in slide-in-from-bottom-10">
          <button onClick={() => setView('students')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'students' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Users size={16}/> Students</button>
          {userRole === 'owner' && (
            <>
              <button onClick={() => setView('finance')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'finance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Wallet size={16}/> Payments</button>
              <button onClick={() => setView('analytics')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'analytics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><BarChart3 size={16}/> Analytics</button>
            </>
          )}
        </nav>
      )}
    </div>
  );
}