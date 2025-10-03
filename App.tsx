
import React, { useState, useMemo, useEffect } from 'react';

import type { Task, DailyObservation, UpcomingPriorityTask, MonthlyReportData, Seccional, OverdueTask } from './types.ts';
import { TaskStatus, SECCIONALES_INITIAL, DEFAULT_ADMIN_USER } from './constants.ts';
import Calendar from './components/Calendar';
import DailyTasks from './components/DailyTasks';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import AddTaskModal from './components/AddTaskModal';
import EditTaskModal from './components/EditTaskModal';
import StatsModal from './components/StatsModal';
import ConfirmationModal from './components/ConfirmationModal';
import { generateConsolidatedSummary, generateMonthlySummary, searchTasksWithAI } from './services/geminiService.ts';
import Settings from './components/Settings';
import CommentModal from './components/CommentModal';
import SaveToast from './components/SaveToast';
import { getCountdownInfo, toLocalDateString } from './utils.ts';
import LoginScreen from './components/LoginScreen';
import OverdueTasksNotification from './components/OverdueTasksNotification';
import CancellationReasonModal from './components/CancellationReasonModal';
import PasswordModal from './components/PasswordModal';
import SetPasswordModal from './components/SetPasswordModal';
import SearchModal from './components/SearchModal';
import RenameModal from './components/RenameModal';


const APP_DATA_KEYS = {
  TASKS: 'taskflow-tasks',
  OBSERVATIONS: 'taskflow-observations',
  SECCIONALES: 'taskflow-seccionals',
  ADMIN_NAME: 'taskflow-admin-name',
  ADMIN_PASSWORD: 'taskflow-admin-password',
};

const todayDateString = toLocalDateString(new Date());

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const savedTasks = localStorage.getItem(APP_DATA_KEYS.TASKS);
      return savedTasks ? JSON.parse(savedTasks) : [
        { id: '1', date: todayDateString, title: 'Informe de Ventas Trimestral', description: 'Finalizar cifras de ventas del Q3.', status: TaskStatus.Completed, seccional: 'Andalucia', isPriority: true },
        { id: '2', date: todayDateString, title: 'Lanzar Campaña en Redes Sociales', description: 'Comenzar campaña para el nuevo producto.', status: TaskStatus.InProgress, seccional: 'Bugalagrande', isPriority: false },
        { id: '3', date: todayDateString, title: 'Desplegar API v2', description: 'Subir nueva versión de la API a producción.', status: TaskStatus.Pending, seccional: 'Zarzal', isPriority: true },
        { id: '4', date: todayDateString, title: 'Llamadas de Seguimiento a Clientes', description: 'Contactar clientes clave de la semana pasada.', status: TaskStatus.Pending, seccional: 'Andalucia', isPriority: false },
      ];
    } catch {
      return [];
    }
  });
  const [observations, setObservations] = useState<DailyObservation[]>(() => {
    try {
      const savedObs = localStorage.getItem(APP_DATA_KEYS.OBSERVATIONS);
      return savedObs ? JSON.parse(savedObs) : [
        { date: todayDateString, seccional: 'Andalucia', text: 'El equipo va por buen camino con el informe trimestral. La moral está alta hoy.'}
      ];
    } catch {
      return [];
    }
  });
  const [seccionals, setSeccionals] = useState<Seccional[]>(() => {
    try {
      const savedDepts = localStorage.getItem(APP_DATA_KEYS.SECCIONALES);
      return savedDepts ? JSON.parse(savedDepts) : SECCIONALES_INITIAL;
    } catch {
      return SECCIONALES_INITIAL;
    }
  });
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem(APP_DATA_KEYS.ADMIN_NAME) || DEFAULT_ADMIN_USER;
  });
  const [adminPassword, setAdminPassword] = useState<string | null>(() => {
    return localStorage.getItem(APP_DATA_KEYS.ADMIN_PASSWORD);
  });
  
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [currentScreen, setCurrentScreen] = useState<'login' | 'department' | 'admin'>('login');
  const [adminSubView, setAdminSubView] = useState<'dashboard' | 'settings'>('dashboard');
  const [activeSeccional, setActiveSeccional] = useState<string>('');
  
  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isStatsModalOpen, setStatsModalOpen] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsContent, setStatsContent] = useState('');
  const [monthlyReportData, setMonthlyReportData] = useState<MonthlyReportData | null>(null);
  const [isLoadingMonthlyReport, setIsLoadingMonthlyReport] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [isCommentModalOpen, setCommentModalOpen] = useState(false);
  const [commentingTask, setCommentingTask] = useState<Task | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isConfirmSeccionalModalOpen, setConfirmSeccionalModalOpen] = useState(false);
  const [seccionalToDelete, setSeccionalToDelete] = useState<string | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [showOverdueNotification, setShowOverdueNotification] = useState(false);
  const [isCancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [taskToCancel, setTaskToCancel] = useState<Task | null>(null);
  
  // Search Modal State
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Password modal state
  const [loginAttempt, setLoginAttempt] = useState<{ role: 'admin' | 'department'; seccional?: Seccional } | null>(null);
  const [passwordError, setPasswordError] = useState('');

  // Set password modal state
  const [passwordTarget, setPasswordTarget] = useState<Seccional | { name: 'admin' } | null>(null);

  // Rename modal state
  const [renamingTarget, setRenamingTarget] = useState<{ type: 'admin' | 'seccional', currentName: string } | null>(null);


  // --- State Update Wrappers ---
  const updateTasks = (updater: React.SetStateAction<Task[]>) => {
    setTasks(updater);
    setIsDirty(true);
  };
  const updateObservations = (updater: React.SetStateAction<DailyObservation[]>) => {
    setObservations(updater);
    setIsDirty(true);
  };
  const updateSeccionals = (updater: React.SetStateAction<Seccional[]>) => {
    setSeccionals(updater);
    setIsDirty(true);
  };
  const updateAdminName = (name: string) => {
    setAdminName(name);
    setIsDirty(true);
  };
  const updateAdminPassword = (password: string | null) => {
    setAdminPassword(password);
    setIsDirty(true);
  }

  const handleSave = () => {
    localStorage.setItem(APP_DATA_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(APP_DATA_KEYS.OBSERVATIONS, JSON.stringify(observations));
    localStorage.setItem(APP_DATA_KEYS.SECCIONALES, JSON.stringify(seccionals));
    localStorage.setItem(APP_DATA_KEYS.ADMIN_NAME, adminName);
    if (adminPassword) {
      localStorage.setItem(APP_DATA_KEYS.ADMIN_PASSWORD, adminPassword);
    } else {
      localStorage.removeItem(APP_DATA_KEYS.ADMIN_PASSWORD);
    }
    setIsDirty(false);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    if (currentScreen !== 'login') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = toLocalDateString(today);

      const allOverdue = tasks
        .filter(task =>
            task.date < todayString &&
            (task.status === TaskStatus.Pending || task.status === TaskStatus.InProgress)
        )
        .map(task => ({
            ...task,
            countdown: getCountdownInfo(task.date),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setOverdueTasks(allOverdue);
      if (allOverdue.length > 0) {
        setShowOverdueNotification(true);
      }
    } else {
        setOverdueTasks([]);
        setShowOverdueNotification(false);
    }
  }, [currentScreen, tasks]);

  useEffect(() => {
    if (currentScreen !== 'department' || !activeSeccional || Notification.permission !== 'granted') return;
    
    const todayString = toLocalDateString(new Date());
    const tasksForToday = tasks.filter(task => task.date === todayString && task.seccional === activeSeccional);

    if (tasksForToday.length > 0) {
      const priorityTasksCount = tasksForToday.filter(t => t.isPriority).length;
      let body = `Tienes ${tasksForToday.length} tarea(s) programada(s) para hoy.`;
      if (priorityTasksCount > 0) {
        body += ` ¡${priorityTasksCount} de ellas son de alta prioridad!`;
      }

      new Notification(`Recordatorio de Tareas para ${activeSeccional}`, { body, tag: 'daily-task-reminder' });
    }
  }, [currentScreen, activeSeccional, tasks]);

  const formattedSelectedDate = useMemo(() => {
    return toLocalDateString(selectedDate);
  }, [selectedDate]);

  const tasksForSelectedDay = useMemo(() => {
    return tasks.filter(task => task.date === formattedSelectedDate).sort((a,b) => a.id.localeCompare(b.id));
  }, [tasks, formattedSelectedDate]);
  
  const tasksForCurrentSeccional = useMemo(() => {
    if (currentScreen !== 'department') return [];
    return tasksForSelectedDay.filter(task => 
        task.seccional === activeSeccional && task.status !== TaskStatus.Cancelled
    );
  }, [tasksForSelectedDay, activeSeccional, currentScreen]);
  
  const observationForCurrentSeccional = useMemo(() => {
    if (currentScreen !== 'department') return '';
    return observations.find(obs => obs.date === formattedSelectedDate && obs.seccional === activeSeccional)?.text || '';
  }, [observations, formattedSelectedDate, activeSeccional, currentScreen]);

  const upcomingPriorityTasks: UpcomingPriorityTask[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks
      .filter(task => {
        const taskDate = new Date(task.date + 'T00:00:00');
        return (
          task.isPriority &&
          task.status !== TaskStatus.Completed &&
          taskDate >= today
        );
      })
      .map(task => ({
        ...task,
        countdown: getCountdownInfo(task.date),
      }))
      .sort((a, b) => a.countdown.days - b.countdown.days);
  }, [tasks]);
  
  const overdueTasksForView = useMemo(() => {
    if (currentScreen === 'department') {
      return overdueTasks.filter(task => task.seccional === activeSeccional);
    }
    if (currentScreen === 'admin') {
      // For the admin view, only show non-priority overdue tasks in the notification.
      // Priority overdue tasks are displayed in the "Urgent Priorities" section to avoid duplication.
      return overdueTasks.filter(task => !task.isPriority);
    }
    return overdueTasks; // Default case, handles 'login' screen where overdueTasks is empty.
  }, [overdueTasks, currentScreen, activeSeccional]);

  const urgentPriorityTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks
      .filter(task => {
        const taskDate = new Date(task.date + 'T00:00:00');
        return (
          task.isPriority &&
          task.status !== TaskStatus.Completed &&
          taskDate <= today
        );
      })
      .map(task => ({
        ...task,
        countdown: getCountdownInfo(task.date),
      }))
      .sort((a, b) => a.countdown.days - b.countdown.days);
  }, [tasks]);

  const handleAddTask = (title: string, description: string, isPriority: boolean) => {
    const newTask: Task = {
      id: Date.now().toString(),
      date: formattedSelectedDate,
      title,
      description,
      status: TaskStatus.Pending,
      seccional: activeSeccional,
      isPriority,
    };
    updateTasks(prevTasks => [...prevTasks, newTask]);
    setAddTaskModalOpen(false);
  };

  const handleEditTask = (updatedTask: Task) => {
    updateTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    setEditTaskModalOpen(false);
    setEditingTask(null);
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setConfirmModalOpen(true);
  };

  const confirmDeleteTask = () => {
    if (!taskToDeleteId) return;
    updateTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDeleteId));
    setConfirmModalOpen(false);
    setTaskToDeleteId(null);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskModalOpen(true);
  };

  const handleUpdateTaskStatus = (taskId: string, status: TaskStatus) => {
    if (status === TaskStatus.Cancelled && currentScreen === 'department') {
        const taskToUpdate = tasks.find(t => t.id === taskId);
        if (taskToUpdate) {
            setTaskToCancel(taskToUpdate);
            setCancellationModalOpen(true);
        }
    } else {
        updateTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id !== taskId) return task;
                
                const updatedTask: Task = { ...task, status };
                if (status !== TaskStatus.Cancelled) {
                    delete updatedTask.cancellationReason;
                }
                return updatedTask;
            })
        );
    }
  };

  const handleConfirmCancellation = (reason: string) => {
    if (!taskToCancel) return;
    updateTasks(prevTasks =>
        prevTasks.map(task =>
            task.id === taskToCancel.id 
                ? { ...task, status: TaskStatus.Cancelled, cancellationReason: reason } 
                : task
        )
    );
    setCancellationModalOpen(false);
    setTaskToCancel(null);
  };

  const handleSaveObservation = (text: string) => {
    updateObservations(prevObs => {
        const existingObsIndex = prevObs.findIndex(o => o.date === formattedSelectedDate && o.seccional === activeSeccional);
        if (existingObsIndex > -1) {
            const newObs = [...prevObs];
            newObs[existingObsIndex] = { ...newObs[existingObsIndex], text };
            return newObs;
        }
        return [...prevObs, { date: formattedSelectedDate, seccional: activeSeccional, text }];
    });
  };

  const handleGenerateConsolidatedStats = async () => {
     if (!isOnline) {
      setStatsContent("Necesitas conexión a internet para generar reportes con IA.");
      setStatsModalOpen(true);
      return;
    }
    setIsLoadingStats(true);
    setStatsContent('');
    setMonthlyReportData(null);
    const observationsForDay = observations.filter(obs => obs.date === formattedSelectedDate);
    const summary = await generateConsolidatedSummary(tasksForSelectedDay, observationsForDay);
    setStatsContent(summary);
    setStatsModalOpen(true);
    setIsLoadingStats(false);
  };

  const handleGenerateMonthlyReport = async () => {
    if (!isOnline) {
      setStatsContent("Necesitas conexión a internet para generar reportes con IA.");
      setMonthlyReportData(null);
      setStatsModalOpen(true);
      return;
    }
    setIsLoadingMonthlyReport(true);
    setMonthlyReportData(null);
    setStatsContent('');
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const tasksForMonth = tasks.filter(task => {
        const taskDate = new Date(task.date + 'T00:00:00');
        return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });

    const observationsForMonth = observations.filter(obs => {
        const obsDate = new Date(obs.date + 'T00:00:00');
        return obsDate.getFullYear() === year && obsDate.getMonth() === month;
    });

    const reportJsonString = await generateMonthlySummary(tasksForMonth, observationsForMonth);
    
    try {
        const reportData = JSON.parse(reportJsonString);
        setMonthlyReportData(reportData);
    } catch (error) {
        console.error("Failed to parse monthly report JSON:", error);
        setStatsContent("Error al procesar el reporte mensual de la IA. Por favor, inténtalo de nuevo.");
    }

    setIsLoadingMonthlyReport(false);
  };

  const handleAddSeccional = (name: string, password?: string): boolean => {
    if (seccionals.find(d => d.name.toLowerCase() === name.toLowerCase()) || name === adminName) {
      return false;
    }
    const newSeccional: Seccional = { name, password: password || undefined };
    updateSeccionals(prev => {
      const newDepts = [...prev, newSeccional];
      if (prev.length === 0) {
        setActiveSeccional(name);
      }
      return newDepts;
    });
    return true;
  };

  const handleDeleteSeccional = (name: string) => {
    setSeccionalToDelete(name);
    setConfirmSeccionalModalOpen(true);
  };

  const confirmDeleteSeccional = () => {
    if (!seccionalToDelete) return;
    updateTasks(prevTasks => prevTasks.filter(task => task.seccional !== seccionalToDelete));
    updateObservations(prevObs => prevObs.filter(obs => obs.seccional !== seccionalToDelete));
    
    updateSeccionals(prev => {
      const newSeccionals = prev.filter(d => d.name !== seccionalToDelete);
      if (activeSeccional === seccionalToDelete) {
        setActiveSeccional(newSeccionals.length > 0 ? newSeccionals[0].name : '');
      }
      return newSeccionals;
    });
    setConfirmSeccionalModalOpen(false);
    setSeccionalToDelete(null);
  };

  const openCommentModal = (task: Task) => {
    setCommentingTask(task);
    setCommentModalOpen(true);
  };

  const handleAddComment = (taskId: string, comment: string) => {
    if (!comment.trim()) return;
    const formattedComment = `${adminName}: ${comment.trim()}`;
    updateTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, comments: [...(task.comments || []), formattedComment] }
          : task
      )
    );
    setCommentModalOpen(false);
    setCommentingTask(null);
  };

  const handleLogin = (role: 'admin' | 'department', seccional?: Seccional) => {
    const requiredPassword = role === 'admin' ? adminPassword : seccional?.password;
    if (!requiredPassword) {
      if (role === 'admin') {
        setCurrentScreen('admin');
      } else if (seccional) {
        setActiveSeccional(seccional.name);
        setCurrentScreen('department');
      }
    } else {
      setLoginAttempt({ role, seccional });
    }
  };

  const handlePasswordVerification = (password: string) => {
    if (!loginAttempt) return;

    const correctPassword = loginAttempt.role === 'admin'
      ? adminPassword
      : loginAttempt.seccional?.password;
    
    if (password === correctPassword) {
      if (loginAttempt.role === 'admin') {
        setCurrentScreen('admin');
      } else if (loginAttempt.seccional) {
        setActiveSeccional(loginAttempt.seccional.name);
        setCurrentScreen('department');
      }
      setLoginAttempt(null);
      setPasswordError('');
    } else {
      setPasswordError('Contraseña incorrecta.');
    }
  };
  
  const handleExit = () => {
    setCurrentScreen('login');
    setActiveSeccional('');
    if (currentScreen === 'admin') {
      setAdminSubView('dashboard');
    }
  };

  const handleSetAdminPassword = (password: string) => {
    updateAdminPassword(password || null);
    setPasswordTarget(null);
  };

  const handleUpdateSeccionalPassword = (name: string, password: string) => {
    updateSeccionals(prev => 
      prev.map(s => s.name === name ? { ...s, password: password || undefined } : s)
    );
    setPasswordTarget(null);
  };
  
  const handleRename = (target: { type: 'admin' | 'seccional', currentName: string }, newName: string): boolean => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return false;

    if (target.type === 'admin') {
        if (seccionals.some(s => s.name.toLowerCase() === trimmedNewName.toLowerCase())) {
            return false; // Prevent admin name from clashing with a seccional name
        }
        updateAdminName(trimmedNewName);
        setRenamingTarget(null);
        return true;
    }

    if (target.type === 'seccional') {
        // Check for duplicates (case-insensitive)
        if (
            seccionals.some(s => s.name.toLowerCase() === trimmedNewName.toLowerCase() && s.name.toLowerCase() !== target.currentName.toLowerCase()) ||
            adminName.toLowerCase() === trimmedNewName.toLowerCase()
        ) {
            return false; // Name already exists or clashes with admin name
        }

        const oldName = target.currentName;

        // Update seccionals list
        updateSeccionals(prev => prev.map(s => s.name === oldName ? { ...s, name: trimmedNewName } : s));

        // Update tasks
        updateTasks(prev => prev.map(t => t.seccional === oldName ? { ...t, seccional: trimmedNewName } : t));

        // Update observations
        updateObservations(prev => prev.map(o => o.seccional === oldName ? { ...o, seccional: trimmedNewName } : o));
        
        // Update active seccional if it's the one being renamed
        if (activeSeccional === oldName) {
            setActiveSeccional(trimmedNewName);
        }
        
        setRenamingTarget(null);
        return true;
    }
    
    return false;
  };

  const tasksForSearch = useMemo(() => {
    if (currentScreen === 'admin') {
      return tasks;
    }
    if (currentScreen === 'department') {
      return tasks.filter(t => t.seccional === activeSeccional);
    }
    return [];
  }, [tasks, currentScreen, activeSeccional]);

  const handleAiSearch = async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);
    try {
        const taskIds = await searchTasksWithAI(query, tasksForSearch);
        const foundTasks = tasksForSearch.filter(task => taskIds.includes(task.id));
        setSearchResults(foundTasks);
    } catch (error) {
        console.error("AI Search failed", error);
    } finally {
        setIsSearching(false);
    }
  };

  const openSearchModal = () => {
    setSearchModalOpen(true);
  };

  const handleCloseSearchModal = () => {
    setSearchModalOpen(false);
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);
  };

  const handleNavigateToTaskDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in UTC to avoid timezone issues
    const newDate = new Date(Date.UTC(year, month - 1, day));
    setSelectedDate(newDate);
    handleCloseSearchModal();
  };

  return (
    <div className="min-h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {currentScreen === 'login' ? (
        <LoginScreen onLogin={handleLogin} seccionals={seccionals} adminName={adminName} />
      ) : (
        <div className="container mx-auto max-w-7xl p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <Header 
              currentScreen={currentScreen}
              onExit={handleExit}
              activeSeccional={activeSeccional}
              onSettingsClick={() => setAdminSubView('settings')}
              onSearchClick={openSearchModal}
              isOnline={isOnline}
              upcomingPriorityTasks={currentScreen === 'admin' ? upcomingPriorityTasks : []}
              adminName={adminName}
            />
            
            {!isOnline && (
              <div className="bg-yellow-500 text-white text-center p-2 text-sm font-semibold">
                Estás desconectado. Algunas funciones pueden no estar disponibles.
              </div>
            )}
            
            {showOverdueNotification && overdueTasksForView.length > 0 && (
              <OverdueTasksNotification
                tasks={overdueTasksForView}
                onDismiss={() => setShowOverdueNotification(false)}
                view={currentScreen}
                onNavigateToTask={handleNavigateToTaskDate}
              />
            )}


            <main className="p-4 sm:p-6">
              {currentScreen === 'department' ? (
                  <>
                    {seccionals.length > 0 ? (
                        <>
                          <Calendar 
                            selectedDate={selectedDate} 
                            setSelectedDate={setSelectedDate} 
                            tasks={tasks.filter(t => t.seccional === activeSeccional)}
                          />
                          <DailyTasks
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            tasks={tasksForCurrentSeccional}
                            onAddTask={() => setAddTaskModalOpen(true)}
                            onUpdateStatus={handleUpdateTaskStatus}
                            onEditTask={openEditModal}
                            observation={observationForCurrentSeccional}
                            onSaveObservation={handleSaveObservation}
                          />
                        </>
                    ) : (
                      <div className="text-center py-16 px-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No hay seccionales configuradas</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Pídele al administrador que añada seccionales desde el panel de configuración.</p>
                      </div>
                    )}
                  </>
              ) : ( // currentScreen === 'admin'
                  <>
                    {adminSubView === 'dashboard' ? (
                        <AdminDashboard 
                          selectedDate={selectedDate}
                          setSelectedDate={setSelectedDate}
                          tasks={tasks}
                          observations={observations}
                          seccionals={seccionals.map(s => s.name)}
                          onGenerateConsolidatedStats={handleGenerateConsolidatedStats}
                          isLoadingStats={isLoadingStats}
                          consolidatedStats={statsContent}
                          onGenerateMonthlyReport={handleGenerateMonthlyReport}
                          isLoadingMonthlyReport={isLoadingMonthlyReport}
                          monthlyReportData={monthlyReportData}
                          isOnline={isOnline}
                          onUpdateStatus={handleUpdateTaskStatus}
                          onAddComment={openCommentModal}
                          urgentTasks={urgentPriorityTasks}
                          onDeleteTask={handleDeleteTask}
                          onNavigateToTask={handleNavigateToTaskDate}
                          adminName={adminName}
                        />
                    ) : (
                        <Settings
                          seccionals={seccionals}
                          onAddSeccional={handleAddSeccional}
                          onDeleteSeccional={handleDeleteSeccional}
                          onBack={() => setAdminSubView('dashboard')}
                          onSetPassword={setPasswordTarget}
                          adminPasswordIsSet={!!adminPassword}
                          adminName={adminName}
                          onRenameRequest={setRenamingTarget}
                        />
                    )}
                  </>
              )}
            </main>
          </div>
        </div>
      )}

      {/* FIX: Add condition `currentScreen !== 'login'` to ensure the type of `currentScreen` is narrowed to 'admin' | 'department' before passing it to SearchModal. */}
      {isSearchModalOpen && currentScreen !== 'login' && (
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={handleCloseSearchModal}
          onSearch={handleAiSearch}
          onTaskClick={handleNavigateToTaskDate}
          currentScreen={currentScreen}
          results={searchResults}
          isLoading={isSearching}
          hasSearched={hasSearched}
        />
      )}

      {loginAttempt && (
        <PasswordModal
          targetName={loginAttempt.role === 'admin' ? adminName : loginAttempt.seccional?.name || ''}
          onClose={() => {
            setLoginAttempt(null);
            setPasswordError('');
          }}
          onSubmit={handlePasswordVerification}
          error={passwordError}
        />
      )}

      {passwordTarget && (
        <SetPasswordModal
          targetName={'name' in passwordTarget && passwordTarget.name !== 'admin' ? passwordTarget.name : adminName}
          onClose={() => setPasswordTarget(null)}
          onSave={(password) => {
            if ('name' in passwordTarget) {
               if (passwordTarget.name === 'admin') {
                  handleSetAdminPassword(password);
               } else {
                  handleUpdateSeccionalPassword(passwordTarget.name, password);
               }
            }
          }}
        />
      )}

      {renamingTarget && (
        <RenameModal
          targetType={renamingTarget.type === 'admin' ? 'administrador' : 'seccional'}
          currentName={renamingTarget.currentName}
          onClose={() => setRenamingTarget(null)}
          onSave={(newName) => handleRename(renamingTarget, newName)}
        />
      )}

      {isAddTaskModalOpen && (
        <AddTaskModal 
          onClose={() => setAddTaskModalOpen(false)} 
          onSave={handleAddTask} 
        />
      )}
      
      {isEditTaskModalOpen && editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => {
            setEditTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleEditTask}
        />
      )}

      {isStatsModalOpen && (
        <StatsModal 
          onClose={() => setStatsModalOpen(false)}
          stats={statsContent}
        />
      )}

      {isConfirmModalOpen && (
        <ConfirmationModal
          title="Confirmar Eliminación"
          message="¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer."
          onClose={() => {
            setConfirmModalOpen(false);
            setTaskToDeleteId(null);
          }}
          onConfirm={confirmDeleteTask}
          confirmText="Eliminar"
        />
      )}

      {isConfirmSeccionalModalOpen && (
        <ConfirmationModal
          title="Confirmar Eliminación de Seccional"
          message={`¿Estás seguro de que quieres eliminar la seccional "${seccionalToDelete}"? Todas las tareas y observaciones asociadas también serán eliminadas. Esta acción no se puede deshacer.`}
          onClose={() => {
            setConfirmSeccionalModalOpen(false);
            setSeccionalToDelete(null);
          }}
          onConfirm={confirmDeleteSeccional}
          confirmText="Eliminar"
        />
      )}

      {isCommentModalOpen && commentingTask && (
        <CommentModal
          task={commentingTask}
          onClose={() => {
            setCommentModalOpen(false);
            setCommentingTask(null);
          }}
          onSave={handleAddComment}
        />
      )}

      {isCancellationModalOpen && taskToCancel && (
        <CancellationReasonModal
          task={taskToCancel}
          onClose={() => {
            setCancellationModalOpen(false);
            setTaskToCancel(null);
          }}
          onConfirm={handleConfirmCancellation}
        />
      )}

      {isDirty && (
        <button
          onClick={handleSave}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-50 animate-pulse"
          aria-label="Guardar cambios"
          title="Guardar cambios"
        >
          <SaveIcon />
        </button>
      )}

      <SaveToast show={showSaveToast} message="Cambios guardados con éxito" />
    </div>
  );
};

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3l-4 4-4-4H8z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V4a2 2 0 00-2-2H10a2 2 0 00-2 2v3" />
  </svg>
);


export default App;