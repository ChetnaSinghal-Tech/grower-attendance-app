import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Plus, Users, Wallet, Search, Calendar, 
  MessageSquare, BarChart3, Send, TrendingUp, Download, Trash2, 
  Lock, LogOut, IndianRupee, ArrowUpRight, EyeOff, Cloud, CloudCheck 
} from 'lucide-react';

// FIREBASE ENGINE
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// REPLACE THESE WITH YOUR ACTUAL FIREBASE KEYS
const firebaseConfig = {
  apiKey: "AIzaSyCLxByDtWZzSPAWsFixXHnopv0p6au1aRc",
  authDomain: "grower-app-e5f91.firebaseapp.com",
  databaseURL: "https://grower-app-e5f91-default-rtdb.firebaseio.com/",
  projectId: "grower-app-e5f91",
  storageBucket: "grower-app-e5f91.firebasestorage.app",
  messagingSenderId: "761383418884",
  appId: "1:761383418884:web:1597207c92b43049a88951",
  measurementId: "G-VQ8HX84VTH"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  // --- STATES ---
  const [userRole, setUserRole] = useState<'developer' | 'owner' | 'teacher' | 'none'>('none');
  const [view, setView] = useState<'students' | 'finance' | 'analytics' | 'admin'>('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [students, setStudents] = useState<Student[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newFee, setNewFee] = useState("");
  const [showForm, setShowForm] = useState(false);

  const MASTER_PIN = "1234"; 
  const TEACHER_PIN = "5555";
  const DEV_PIN = "0000"; 
  const MY_PHONE = "918287282426";
  
  const [logoClicks, setLogoClicks] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(true); 

  // --- PERSISTENCE (EXPIRY) ---
  const [expiryDate, setExpiryDate] = useState(() => {
    const saved = localStorage.getItem('grower_expiry_v1');
    return saved || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  });

  // --- BACKEND SYNC ---
  useEffect(() => {
    const studentRef = ref(db, 'students/');
    const unsubscribe = onValue(studentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStudents(data);
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = (updatedList: Student[]) => {
    set(ref(db, 'students/'), updatedList);
  };

  useEffect(() => {
    localStorage.setItem('grower_expiry_v1', expiryDate);
  }, [expiryDate]);

  const isExpired = new Date() > new Date(expiryDate);

  // --- CORE FUNCTIONS ---
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
      teacherName: newTeacher || "Staff", feeAmount: Number(newFee),
      phone: newPhone, paidMonths: [], attendanceHistory: {}
    };
    const newList = [...students, newStudent];
    setStudents(newList);
    saveToCloud(newList);
    setNewName(""); setNewPhone(""); setNewClass(""); setNewTeacher(""); setNewFee("");
    setShowForm(false);
  };

  const markAttendance = (id: number, status: 'present' | 'absent') => {
    const newList = students.map(s => {
      if (s.id === id) {
        const current = s.attendanceHistory[selectedDate];
        return { ...s, attendanceHistory: { ...s.attendanceHistory, [selectedDate]: current === status ? 'none' : status }};
      }
      return s;
    });
    setStudents(newList);
    saveToCloud(newList);
  };

  const deleteStudent = (id: number) => {
    if(window.confirm("Delete record?")) {
      const newList = students.filter(s => s.id !== id);
      setStudents(newList);
      saveToCloud(newList);
    }
  };

  // --- ANALYTICS LOGIC ---
  const currentMonthKey = selectedDate.substring(0, 7);
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "All" || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  const feesCollected = filteredStudents.filter(s => s.paidMonths.includes(currentMonthKey)).reduce((acc, s) => acc + s.feeAmount, 0);
  const feesPending = filteredStudents.filter(s => !s.paidMonths.includes(currentMonthKey)).reduce((acc, s) => acc + s.feeAmount, 0);
  const absentees = filteredStudents.filter(s => s.attendanceHistory[selectedDate] === 'absent');

  const attendanceTrend = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayStudents = students.filter(s => selectedClass === "All" || s.className === selectedClass);
    const present = dayStudents.filter(s => s.attendanceHistory[dateStr] === 'present').length;
    return { date: dateStr, percentage: Math.round((present / (dayStudents.length || 1)) * 100) };
  }).reverse();

  const avgAttendance = Math.round(attendanceTrend.reduce((acc, curr) => acc + curr.percentage, 0) / 7);

  const exportToCSV = () => {
    const headers = "Name,Phone,Class,Status\n";
    const rows = students.map(s => `${s.name},${s.phone},${s.className},${s.paidMonths.includes(currentMonthKey)?'Paid':'Unpaid'}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "Grower_Report.csv"; a.click();
  };

  if (isExpired && userRole !== 'developer') {
    return (
      <div className="max-w-md mx-auto h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center text-white font-sans">
        <Lock size={64} className="text-rose-500 mb-6" />
        <h1 onClick={handleLogoClick} className="text-3xl font-black italic mb-2">GROWER</h1>
        <p className="text-slate-400 text-sm mb-8 italic">Subscription Expired. Contact Admin.</p>
        <button onClick={() => window.open(`https://wa.me/${MY_PHONE}`, '_blank')} className="w-full bg-indigo-600 py-4 rounded-2xl font-bold">Renew Access</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-32 font-sans text-slate-900">
      
      {/* CLOUD STATUS INDICATOR */}
      <div className="fixed top-4 right-4 z-[200]">
        {isSyncing ? <Cloud size={18} className="text-indigo-400 animate-pulse" /> : <CloudCheck size={18} className="text-emerald-500" />}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-xs shadow-2xl text-center">
            <h1 onClick={handleLogoClick} className="text-2xl font-black italic mb-6 text-slate-800 tracking-tighter">GROWER</h1>
            <input type="password" placeholder="Enter PIN" className="w-full bg-slate-100 p-4 rounded-2xl text-center text-lg font-bold outline-none mb-4 border-2 border-transparent focus:border-indigo-600" value={pinInput} onChange={(e) => setPinInput(e.target.value)} autoFocus />
            <button onClick={verifyPin} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">Unlock App</button>
          </div>
        </div>
      )}

      {userRole !== 'developer' && userRole !== 'none' && (
        <header className="bg-indigo-600 text-white p-6 rounded-b-[3.5rem] shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h1 onClick={handleLogoClick} className="text-2xl font-black italic tracking-tighter cursor-pointer">GROWER</h1>
            <button onClick={logout} className="p-2 bg-white/10 rounded-full"><LogOut size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-4 border border-white/20">
              <p className="text-[9px] font-black uppercase text-indigo-100 mb-1 tracking-widest">Inflow</p>
              <p className="text-xl font-bold">₹{userRole === 'teacher' ? '---' : feesCollected}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-4 border border-white/20">
              <p className="text-[9px] font-black uppercase text-indigo-100 mb-1 tracking-widest">Dues</p>
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
          <div className="space-y-6 text-center py-10">
            <EyeOff size={48} className="mx-auto text-indigo-600 mb-4" />
            <h2 className="text-xl font-black">Developer Console</h2>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-indigo-600">
              <label className="text-[10px] font-black uppercase text-indigo-600 block mb-2">Set Expiry</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-center border mb-6" />
              <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">Save & Logout</button>
            </div>
          </div>
        )}

        {userRole !== 'developer' && userRole !== 'none' && (
          <>
            {view === 'analytics' && userRole === 'owner' ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border">
                    <TrendingUp size={20} className="text-emerald-600 mb-3" />
                    <p className="text-[9px] font-black text-slate-400 uppercase">Turnout</p>
                    <p className="text-2xl font-black text-slate-800">{avgAttendance}%</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border">
                    <IndianRupee size={20} className="text-indigo-600 mb-3" />
                    <p className="text-[9px] font-black text-slate-400 uppercase">Recovery</p>
                    <p className="text-2xl font-black text-slate-800">{Math.round((feesCollected / (feesCollected + feesPending || 1)) * 100)}%</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">7-Day Attendance</h3>
                  <div className="flex items-end justify-between h-24 gap-2">
                    {attendanceTrend.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-indigo-100 rounded-t-lg transition-all" style={{ height: `${day.percentage}%`, minHeight: '4px' }}></div>
                        <span className="text-[6px] font-bold text-slate-400 uppercase">{day.date.split('-')[2]}/{day.date.split('-')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
                  <h2 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm"><MessageSquare size={18}/> Parent Alerts</h2>
                  {absentees.length > 0 ? absentees.map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2 border border-indigo-100">
                      <span className="text-xs font-bold text-slate-700">{s.name} ({s.className})</span>
                      <button onClick={() => window.open(`https://wa.me/${s.phone}?text=Notice: ${s.name} was absent for ${s.className} class today.`, '_blank')} className="bg-emerald-500 text-white p-2 rounded-xl"><Send size={14}/></button>
                    </div>
                  )) : <p className="text-xs text-indigo-400 italic text-center py-2">Full attendance today!</p>}
                </div>

                <button onClick={exportToCSV} className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-3"><Download size={20}/> Download Master CSV</button>
              </div>
            ) : view === 'finance' && userRole === 'owner' ? (
              <div className="space-y-4">
                 <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Total Outstanding</p>
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
                        <p className="text-[9px] text-slate-400 font-black uppercase">{s.className} • ₹{s.feeAmount}</p>
                      </div>
                      <button onClick={() => {
                        const newPaid = isPaid ? s.paidMonths.filter(m => m !== currentMonthKey) : [...s.paidMonths, currentMonthKey];
                        const newList = students.map(item => item.id === s.id ? {...item, paidMonths: newPaid} : item);
                        setStudents(newList);
                        saveToCloud(newList);
                      }} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </button>
                    </div>
                   )
                 })}
              </div>
            ) : view === 'students' && (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                  {["All", ...Array.from(new Set(students.map(s => s.className)))].sort().map(cls => (
                    <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedClass === cls ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-100'}`}>{cls}</button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 bg-white rounded-2xl shadow-sm flex items-center px-4 py-3 border border-slate-100">
                    <Search className="text-slate-400 mr-2" size={18} />
                    <input className="text-sm outline-none w-full bg-transparent font-medium" placeholder="Search name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  {userRole === 'owner' && (
                    <button onClick={() => setShowForm(!showForm)} className={`p-4 rounded-2xl shadow-lg transition-all ${showForm ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      {showForm ? <XCircle size={20}/> : <Plus size={20}/>}
                    </button>
                  )}
                </div>

                {showForm && (
                  <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border-t-4 border-indigo-600 space-y-3">
                    <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Student Name" value={newName} onChange={e => setNewName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Class/Subject" value={newClass} onChange={e => setNewClass(e.target.value)} />
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Parent Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Teacher Name" value={newTeacher} onChange={e => setNewTeacher(e.target.value)} />
                      <input className="bg-slate-50 p-4 rounded-2xl text-sm font-bold outline-none border" placeholder="Monthly Fee" type="number" value={newFee} onChange={e => setNewFee(e.target.value)} />
                    </div>
                    <button onClick={addStudent} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirm Registration</button>
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
                            <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase mt-1 inline-block">{s.className}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => markAttendance(s.id, 'present')} className={`p-3 rounded-2xl transition-all ${status === 'present' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={24} /></button>
                            <button onClick={() => markAttendance(s.id, 'absent')} className={`p-3 rounded-2xl transition-all ${status === 'absent' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}><XCircle size={24} /></button>
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
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl flex justify-between border border-white/50 z-50">
          <button onClick={() => setView('students')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'students' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Users size={16}/> Students</button>
          {userRole === 'owner' && (
            <>
              <button onClick={() => setView('finance')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'finance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><Wallet size={16}/> Finance</button>
              <button onClick={() => setView('analytics')} className={`px-5 py-3 rounded-full font-black text-[10px] flex items-center gap-2 uppercase tracking-tighter transition-all ${view === 'analytics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><BarChart3 size={16}/> Reports</button>
            </>
          )}
        </nav>
      )}
    </div>
  );
}