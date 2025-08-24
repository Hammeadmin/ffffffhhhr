import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertCircle,
  RefreshCw,
  X,
  Edit,
  Trash2,
  FileText,
  Activity,
  ChevronDown,
  Flag,
  Target,
  CheckCircle,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getJobs, 
  getCustomers, 
  getTeamMembers, 
  getQuotes,
  createJob, 
  updateJob, 
  deleteJob,
  getJobById,
  getJobActivities,
  createJobActivity,
  formatCurrency,
  formatDate,
  formatDateTime
} from '../lib/database';
import type { 
  Job, 
  Customer, 
  UserProfile, 
  Quote,
  JobStatus, 
  JobPriority,
  JobActivity
} from '../types/database';
import { 
  JOB_STATUS_LABELS, 
  JOB_PRIORITY_LABELS,
  getJobStatusColor, 
  getJobPriorityColor,
  getJobProgressColor
} from '../types/database';
import { useAuth } from '../contexts/AuthContext';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface JobWithRelations extends Job {
  customer?: Customer;
  quote?: Quote;
  assigned_to?: UserProfile;
}

interface JobFormData {
  customer_id: string;
  quote_id: string;
  title: string;
  description: string;
  assigned_to_user_id: string;
  value: string;
  priority: JobPriority;
  deadline: string;
}

interface KanbanColumn {
  id: JobStatus;
  title: string;
  jobs: JobWithRelations[];
  color: string;
}

function JobManagement() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobActivities, setJobActivities] = useState<(JobActivity & { user?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithRelations | null>(null);
  const [editingJob, setEditingJob] = useState<JobWithRelations | null>(null);
  const [draggedJob, setDraggedJob] = useState<JobWithRelations | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const [jobForm, setJobForm] = useState<JobFormData>({
    customer_id: '',
    quote_id: '',
    title: '',
    description: '',
    assigned_to_user_id: '',
    value: '',
    priority: 'normal',
    deadline: ''
  });

  const kanbanColumns: KanbanColumn[] = [
    { id: 'pending', title: 'Väntande', jobs: [], color: 'bg-yellow-50 border-yellow-200' },
    { id: 'in_progress', title: 'Pågående', jobs: [], color: 'bg-blue-50 border-blue-200' },
    { id: 'completed', title: 'Slutförd', jobs: [], color: 'bg-green-50 border-green-200' },
    { id: 'invoiced', title: 'Fakturerad', jobs: [], color: 'bg-purple-50 border-purple-200' }
  ];

  useEffect(() => {
    loadData();
  }, [statusFilter, assignedFilter, priorityFilter, searchTerm, dateFromFilter, dateToFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: statusFilter,
        assignedTo: assignedFilter,
        priority: priorityFilter,
        search: searchTerm,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter
      };
      
      const [jobsResult, customersResult, teamMembersResult, quotesResult] = await Promise.all([
        getJobs(DEMO_ORG_ID, filters),
        getCustomers(DEMO_ORG_ID),
        getTeamMembers(DEMO_ORG_ID),
        getQuotes(DEMO_ORG_ID)
      ]);
      
      if (jobsResult.error) {
        setError(jobsResult.error.message);
        return;
      }
      
      setJobs(jobsResult.data || []);
      setCustomers(customersResult.data || []);
      setTeamMembers(teamMembersResult.data || []);
      setQuotes(quotesResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid hämtning av data.');
    } finally {
      setLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    try {
      const activitiesResult = await getJobActivities(jobId);
      
      if (activitiesResult.error) {
        console.error('Error loading activities:', activitiesResult.error);
      } else {
        setJobActivities(activitiesResult.data || []);
      }
    } catch (err) {
      console.error('Error loading job details:', err);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const jobData = {
        organisation_id: DEMO_ORG_ID,
        customer_id: jobForm.customer_id || null,
        quote_id: jobForm.quote_id || null,
        assigned_to_user_id: jobForm.assigned_to_user_id || null,
        title: jobForm.title,
        description: jobForm.description || null,
        status: 'pending' as JobStatus,
        value: parseFloat(jobForm.value) || 0,
        priority: jobForm.priority,
        deadline: jobForm.deadline || null,
        progress: 0
      };

      const result = await createJob(jobData);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (result.data) {
        setJobs(prev => [result.data!, ...prev]);
        
        // Log creation activity
        if (user) {
          await createJobActivity(
            result.data.id, 
            user.id, 
            'created', 
            `Jobb skapat: ${result.data.title}`
          );
        }
      }

      // Reset form and close modal
      setJobForm({
        customer_id: '',
        quote_id: '',
        title: '',
        description: '',
        assigned_to_user_id: '',
        value: '',
        priority: 'normal',
        deadline: ''
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Kunde inte skapa jobb.');
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: JobStatus, oldStatus: JobStatus) => {
    try {
      // Calculate progress based on status
      let progress = 0;
      switch (newStatus) {
        case 'pending': progress = 0; break;
        case 'in_progress': progress = 50; break;
        case 'completed': progress = 100; break;
        case 'invoiced': progress = 100; break;
      }

      const result = await updateJob(jobId, { status: newStatus, progress });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Update local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId 
            ? { ...job, status: newStatus, progress }
            : job
        )
      );

      // Update selected job if it's the one being updated
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: newStatus, progress } : null);
      }
      
      // Log status change activity
      if (user) {
        const statusLabels = {
          pending: 'Väntande',
          in_progress: 'Pågående',
          completed: 'Slutförd',
          invoiced: 'Fakturerad'
        };
        
        const description = `Status ändrad från ${statusLabels[oldStatus]} till ${statusLabels[newStatus]}`;
        await createJobActivity(jobId, user.id, 'status_change', description, oldStatus, newStatus);
        
        // Reload activities if this job is currently selected
        if (selectedJob && selectedJob.id === jobId) {
          loadJobDetails(jobId);
        }
      }
    } catch (err) {
      console.error('Error updating job status:', err);
      setError('Kunde inte uppdatera jobb-status.');
    }
  };

  const handleDragStart = (e: React.DragEvent, job: JobWithRelations) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: JobStatus) => {
    e.preventDefault();
    
    if (!draggedJob || draggedJob.status === newStatus) {
      setDraggedJob(null);
      return;
    }

    await handleUpdateJobStatus(draggedJob.id, newStatus, draggedJob.status);
    setDraggedJob(null);
  };

  const handleJobClick = async (job: JobWithRelations) => {
    setSelectedJob(job);
    setShowDetailModal(true);
    await loadJobDetails(job.id);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta jobb?')) return;
    
    try {
      const result = await deleteJob(jobId);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      setJobs(prev => prev.filter(job => job.id !== jobId));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Kunde inte ta bort jobb.');
    }
  };

  const handleScheduleTask = () => {
    if (!selectedJob) return;
    
    // Create calendar event data and navigate to calendar
    const eventData = {
      title: `Uppgift: ${selectedJob.title}`,
      type: 'task',
      related_job_id: selectedJob.id,
      description: `Arbete med jobb: ${selectedJob.title}`,
      assigned_to_user_id: selectedJob.assigned_to_user_id
    };
    
    // Store in sessionStorage for calendar to pick up
    sessionStorage.setItem('pendingCalendarEvent', JSON.stringify(eventData));
    
    // Navigate to calendar
    window.location.href = '/kalender';
  };

  const handleCreateInvoice = async () => {
    if (!selectedJob) return;
    
    try {
      const result = await convertJobToInvoice(selectedJob.id);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      
      // Update job status in local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === selectedJob.id 
            ? { ...job, status: 'invoiced' as JobStatus }
            : job
        )
      );
      
      setSelectedJob(prev => prev ? { ...prev, status: 'invoiced' as JobStatus } : null);
      
      // Create activity log
      if (user) {
        await createJobActivity(
          selectedJob.id, 
          user.id, 
          'invoiced', 
          `Faktura skapad från jobb: ${result.data?.invoice_number}`
        );
        
        // Reload activities
        loadJobDetails(selectedJob.id);
      }
      
      alert(`Faktura ${result.data?.invoice_number} skapad framgångsrikt!`);
      
      // Navigate to invoices page
      window.location.href = '/fakturor';
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Kunde inte skapa faktura från jobb.');
    }
  };
  const getProgressPercentage = (status: JobStatus, progress?: number | null): number => {
    if (progress !== null && progress !== undefined) return progress;
    
    switch (status) {
      case 'pending': return 0;
      case 'in_progress': return 50;
      case 'completed': return 100;
      case 'invoiced': return 100;
      default: return 0;
    }
  };

  const getPriorityIcon = (priority: JobPriority) => {
    switch (priority) {
      case 'high': return <Flag className="w-4 h-4 text-red-600" />;
      case 'normal': return <Target className="w-4 h-4 text-blue-600" />;
      case 'low': return <Clock className="w-4 h-4 text-gray-600" />;
      default: return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'created': return Plus;
      case 'status_change': return Activity;
      case 'assigned': return User;
      case 'updated': return Edit;
      default: return Clock;
    }
  };

  // Filter quotes by selected customer
  const filteredQuotes = quotes.filter(quote => 
    !jobForm.customer_id || quote.customer_id === jobForm.customer_id
  );

  // Organize jobs by status for Kanban view
  const organizedColumns = kanbanColumns.map(column => ({
    ...column,
    jobs: jobs.filter(job => job.status === column.id)
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Jobb</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Jobb</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda jobb</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={loadData}
              className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="w-8 h-8 mr-3 text-blue-600" />
            Jobb
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera pågående och avslutade projekt ({jobs.length} totalt)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-l-lg ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-r-lg ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nytt Jobb
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök jobb..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alla status</option>
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alla tilldelningar</option>
            <option value="unassigned">Ej tilldelade</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>{member.full_name}</option>
            ))}
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alla prioriteter</option>
            {Object.entries(JOB_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Från datum"
          />
          
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Till datum"
          />
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const progress = getProgressPercentage(job.status, job.progress);
            return (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.job_number}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {job.priority && getPriorityIcon(job.priority)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                        {JOB_STATUS_LABELS[job.status]}
                      </span>
                    </div>
                  </div>
                  
                  {job.customer && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <User className="w-4 h-4 mr-2" />
                      {job.customer.name}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-green-600 mb-4">
                    <DollarSign className="w-4 h-4 mr-2" />
                    {formatCurrency(job.value)}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Framsteg</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getJobProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {job.created_at ? formatDate(job.created_at) : 'Okänt datum'}
                    </div>
                    {job.assigned_to && (
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {job.assigned_to.full_name}
                      </div>
                    )}
                  </div>
                  
                  {job.deadline && (
                    <div className="mt-2 text-xs text-orange-600">
                      Deadline: {formatDate(job.deadline)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jobb
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tilldelad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioritet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Värde
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Framsteg
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => {
                  const progress = getProgressPercentage(job.status, job.progress);
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-500">{job.job_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.customer?.name || 'Ingen kund'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.assigned_to?.full_name || 'Ej tilldelad'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <select
                            value={job.status}
                            onChange={(e) => handleUpdateJobStatus(job.id, e.target.value as JobStatus, job.status)}
                            className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${getJobStatusColor(job.status)} focus:ring-2 focus:ring-blue-500`}
                          >
                            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {job.priority && getPriorityIcon(job.priority)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJobPriorityColor(job.priority || 'normal')}`}>
                            {JOB_PRIORITY_LABELS[job.priority || 'normal']}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(job.value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${getJobProgressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleJobClick(job)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Visa
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-screen">
          {organizedColumns.map((column) => (
            <div
              key={column.id}
              className={`rounded-lg border-2 border-dashed p-4 ${column.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                  {column.jobs.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {column.jobs.map((job) => {
                  const progress = getProgressPercentage(job.status, job.progress);
                  return (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job)}
                      onClick={() => handleJobClick(job)}
                      className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {job.title}
                        </h4>
                        {job.priority && getPriorityIcon(job.priority)}
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-2">{job.job_number}</p>
                      
                      {job.customer && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <User className="w-3 h-3 mr-1" />
                          {job.customer.name}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-green-600 mb-2">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {formatCurrency(job.value)}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${getJobProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {job.created_at ? formatDate(job.created_at) : 'Okänt'}
                        </div>
                        {job.assigned_to && (
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {job.assigned_to.full_name.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && !loading && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Inga jobb ännu</h3>
            <p className="mt-2 text-gray-500">Skapa ditt första jobb för att komma igång.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nytt Jobb
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Skapa Nytt Jobb</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kund *
                  </label>
                  <select
                    required
                    value={jobForm.customer_id}
                    onChange={(e) => setJobForm(prev => ({ ...prev, customer_id: e.target.value, quote_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Välj kund</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relaterad Offert
                  </label>
                  <select
                    value={jobForm.quote_id}
                    onChange={(e) => setJobForm(prev => ({ ...prev, quote_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ingen offert</option>
                    {filteredQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>{quote.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  required
                  value={jobForm.title}
                  onChange={(e) => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Jobbtitel"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv jobbet..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tilldelad till
                  </label>
                  <select
                    value={jobForm.assigned_to_user_id}
                    onChange={(e) => setJobForm(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Välj teammedlem</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioritet
                  </label>
                  <select
                    value={jobForm.priority}
                    onChange={(e) => setJobForm(prev => ({ ...prev, priority: e.target.value as JobPriority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(JOB_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uppskattat värde (SEK)
                </label>
                <input
                  type="number"
                  value={jobForm.value}
                  onChange={(e) => setJobForm(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Skapa Jobb
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {showDetailModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Jobb Detaljer</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Job Header */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{selectedJob.title}</h4>
                      <p className="text-sm text-gray-600">{selectedJob.job_number}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedJob.priority && getPriorityIcon(selectedJob.priority)}
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getJobStatusColor(selectedJob.status)}`}>
                        {JOB_STATUS_LABELS[selectedJob.status]}
                      </span>
                    </div>
                  </div>
                  
                  {selectedJob.description && (
                    <p className="text-gray-700 mb-4">{selectedJob.description}</p>
                  )}
                </div>
                
                {/* Job Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Jobbinformation</h5>
                    <div className="space-y-2">
                      {selectedJob.customer && (
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedJob.customer.name}
                        </div>
                      )}
                      <div className="flex items-center text-sm">
                        <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                        {formatCurrency(selectedJob.value)}
                      </div>
                      {selectedJob.deadline && (
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          Deadline: {formatDate(selectedJob.deadline)}
                        </div>
                      )}
                      {selectedJob.created_at && (
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          Skapat: {formatDate(selectedJob.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Tilldelning & Status</h5>
                    <div className="space-y-2">
                      {selectedJob.assigned_to ? (
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedJob.assigned_to.full_name}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          Ej tilldelad
                        </div>
                      )}
                      
                      {selectedJob.priority && (
                        <div className="flex items-center text-sm">
                          {getPriorityIcon(selectedJob.priority)}
                          <span className="ml-2">{JOB_PRIORITY_LABELS[selectedJob.priority]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress Section */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Framsteg</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <select
                        value={selectedJob.status}
                        onChange={(e) => handleUpdateJobStatus(selectedJob.id, e.target.value as JobStatus, selectedJob.status)}
                        className={`text-sm font-semibold rounded-full px-3 py-1 border-0 ${getJobStatusColor(selectedJob.status)} focus:ring-2 focus:ring-blue-500`}
                      >
                        {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Framsteg</span>
                        <span>{getProgressPercentage(selectedJob.status, selectedJob.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${getJobProgressColor(getProgressPercentage(selectedJob.status, selectedJob.progress))}`}
                          style={{ width: `${getProgressPercentage(selectedJob.status, selectedJob.progress)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Activity Timeline */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Aktivitetshistorik</h5>
                  {jobActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Ingen aktivitet ännu</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobActivities.map((activity) => {
                        const Icon = getActivityIcon(activity.activity_type);
                        return (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <Icon className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-900">{activity.description}</p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <span>{activity.user?.full_name || 'System'}</span>
                                <span>•</span>
                                <span>{activity.created_at ? formatDateTime(activity.created_at) : 'Okänt datum'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Stäng
                </button>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={handleScheduleTask}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schemalägg Uppgift
                  </button>
                  {selectedJob.status === 'completed' && (
                    <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                      <Receipt className="w-4 h-4 mr-2" />
                      Skapa Faktura
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteJob(selectedJob.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Ta bort
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobManagement;