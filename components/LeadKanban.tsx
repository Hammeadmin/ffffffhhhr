import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import ConfirmDialog from './ConfirmDialog';
import LoadingSpinner from './LoadingSpinner';
import ExportButton from './ExportButton';
import HelpTooltip from './HelpTooltip';
import { 
  Plus, 
  User, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  X,
  Edit,
  FileText,
  Clock,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Activity,
  Send,
  Trash2,
  Quote as QuoteIcon
} from 'lucide-react';
import { 
  getLeads, 
  updateLead, 
  createLead, 
  getCustomers, 
  getTeamMembers, 
  getLeadNotes,
  createLeadNote,
  updateLeadNote,
  deleteLeadNote,
  getLeadActivities,
  createLeadActivity,
  formatCurrency,
  formatDateTime
} from '../lib/database';
import type { Lead, Customer, UserProfile, LeadStatus, LeadNote, LeadActivity } from '../types/database';
import { LEAD_STATUS_LABELS, getLeadStatusColor } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

interface LeadWithRelations extends Lead {
  customer?: Customer;
  assigned_to?: UserProfile;
}

interface KanbanColumn {
  id: LeadStatus;
  title: string;
  leads: LeadWithRelations[];
  color: string;
}

interface AddLeadFormData {
  title: string;
  customer_name: string;
  email: string;
  phone_number: string;
  description: string;
  estimated_value: string;
  source: string;
  assigned_to_user_id: string;
}

function LeadKanban() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [leadNotes, setLeadNotes] = useState<(LeadNote & { user?: UserProfile })[]>([]);
  const [leadActivities, setLeadActivities] = useState<(LeadActivity & { user?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [draggedLead, setDraggedLead] = useState<LeadWithRelations | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'activity'>('details');
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormData>({
    title: '',
    customer_name: '',
    email: '',
    phone_number: '',
    description: '',
    estimated_value: '',
    source: '',
    assigned_to_user_id: ''
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const { success, error: showError } = useToast();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNew: () => setShowAddModal(true),
    onEscape: () => {
      setShowAddModal(false);
      setShowDetailModal(false);
      setActiveTab('details');
      setNewNote('');
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  });

  const columns: KanbanColumn[] = [
    { id: 'new', title: 'Nya', leads: [], color: 'bg-blue-50 border-blue-200' },
    { id: 'contacted', title: 'Kontaktade', leads: [], color: 'bg-yellow-50 border-yellow-200' },
    { id: 'qualified', title: 'Kvalificerade', leads: [], color: 'bg-purple-50 border-purple-200' },
    { id: 'won', title: 'Vunna', leads: [], color: 'bg-green-50 border-green-200' },
    { id: 'lost', title: 'Förlorade', leads: [], color: 'bg-red-50 border-red-200' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [leadsResult, customersResult, teamMembersResult] = await Promise.all([
        getLeads(DEMO_ORG_ID),
        getCustomers(DEMO_ORG_ID),
        getTeamMembers(DEMO_ORG_ID)
      ]);
      
      if (leadsResult.error) {
        showError('Fel vid laddning', leadsResult.error.message);
        return;
      }
      
      if (customersResult.error) {
        showError('Fel vid laddning', customersResult.error.message);
        return;
      }
      
      if (teamMembersResult.error) {
        showError('Fel vid laddning', teamMembersResult.error.message);
        return;
      }
      
      setLeads(leadsResult.data || []);
      setCustomers(customersResult.data || []);
      setTeamMembers(teamMembersResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      showError('Systemfel', 'Ett oväntat fel inträffade vid hämtning av data.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    try {
      const [notesResult, activitiesResult] = await Promise.all([
        getLeadNotes(leadId),
        getLeadActivities(leadId)
      ]);
      
      if (notesResult.error) {
        console.error('Error loading notes:', notesResult.error);
      } else {
        setLeadNotes(notesResult.data || []);
      }
      
      if (activitiesResult.error) {
        console.error('Error loading activities:', activitiesResult.error);
      } else {
        setLeadActivities(activitiesResult.data || []);
      }
    } catch (err) {
      console.error('Error loading lead details:', err);
    }
  };

  const getDaysAgo = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDragStart = (e: React.DragEvent, lead: LeadWithRelations) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      const result = await updateLead(draggedLead.id, { status: newStatus });
      
      if (result.error) {
        showError('Uppdateringsfel', result.error.message);
        return;
      }

      // Update local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === draggedLead.id 
            ? { ...lead, status: newStatus }
            : lead
        )
      );
      
      // Log status change activity
      await handleStatusChange(draggedLead.id, newStatus, draggedLead.status);
    } catch (err) {
      console.error('Error updating lead status:', err);
      showError('Uppdateringsfel', 'Kunde inte uppdatera lead-status.');
    } finally {
      setDraggedLead(null);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First, create or find customer
      let customerId: string | null = null;
      
      if (addLeadForm.customer_name.trim()) {
        // Check if customer exists
        const existingCustomer = customers.find(c => 
          c.name.toLowerCase() === addLeadForm.customer_name.toLowerCase()
        );
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const { createCustomer } = await import('../lib/database');
          const customerResult = await createCustomer({
            organisation_id: DEMO_ORG_ID,
            name: addLeadForm.customer_name,
            email: addLeadForm.email || null,
            phone_number: addLeadForm.phone_number || null,
            address: null,
            postal_code: null,
            city: null
          });
          
          if (customerResult.error) {
            showError('Kundfel', customerResult.error.message);
            return;
          }
          
          customerId = customerResult.data?.id || null;
          
          // Update customers list
          if (customerResult.data) {
            setCustomers(prev => [...prev, customerResult.data!]);
          }
        }
      }

      // Create lead
      const leadData = {
        organisation_id: DEMO_ORG_ID,
        customer_id: customerId,
        assigned_to_user_id: addLeadForm.assigned_to_user_id || null,
        title: addLeadForm.title,
        description: addLeadForm.description || null,
        source: addLeadForm.source || null,
        status: 'new' as LeadStatus,
        estimated_value: addLeadForm.estimated_value ? parseFloat(addLeadForm.estimated_value) : null
      };

      const result = await createLead(leadData);
      
      if (result.error) {
        showError('Skapandefel', result.error.message);
        return;
      }

      // Add to local state
      if (result.data) {
        setLeads(prev => [result.data!, ...prev]);
      }

      // Reset form and close modal
      setAddLeadForm({
        title: '',
        customer_name: '',
        email: '',
        phone_number: '',
        description: '',
        estimated_value: '',
        source: '',
        assigned_to_user_id: ''
      });
      setShowAddModal(false);
      success('Lead skapad', 'Lead har skapats framgångsrikt');
    } catch (err) {
      console.error('Error creating lead:', err);
      showError('Skapandefel', 'Kunde inte skapa lead.');
    }
  };

  const handleAssignmentChange = async (leadId: string, newAssignedUserId: string) => {
    try {
      setIsUpdatingAssignment(true);
      
      const result = await updateLead(leadId, { 
        assigned_to_user_id: newAssignedUserId || null 
      });
      
      if (result.error) {
        showError('Tilldelningsfel', result.error.message);
        return;
      }

      // Update local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { 
                ...lead, 
                assigned_to_user_id: newAssignedUserId || null,
                assigned_to: newAssignedUserId 
                  ? teamMembers.find(member => member.id === newAssignedUserId)
                  : undefined
              }
            : lead
        )
      );

      // Update selected lead if it's the one being updated
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? {
          ...prev,
          assigned_to_user_id: newAssignedUserId || null,
          assigned_to: newAssignedUserId 
            ? teamMembers.find(member => member.id === newAssignedUserId)
            : undefined
        } : null);
      }
      
      // Create activity log for assignment change
      if (user) {
        const assignedMember = newAssignedUserId 
          ? teamMembers.find(member => member.id === newAssignedUserId)
          : null;
        
        const description = assignedMember 
          ? `Lead tilldelad till ${assignedMember.full_name}`
          : 'Lead-tilldelning borttagen';
        
        await createLeadActivity(leadId, user.id, 'assignment_change', description);
        
        // Reload activities if this lead is currently selected
        if (selectedLead && selectedLead.id === leadId) {
          loadLeadDetails(leadId);
        }
        success('Tilldelning uppdaterad', `Lead tilldelad till ${assignedMember?.full_name || 'ingen'}`);
      }
    } catch (err) {
      console.error('Error updating lead assignment:', err);
      showError('Tilldelningsfel', 'Kunde inte uppdatera tilldelning.');
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead || !user) return;
    
    try {
      setIsAddingNote(true);
      const result = await createLeadNote(selectedLead.id, user.id, newNote.trim());
      
      if (result.error) {
        showError('Anteckningsfel', result.error.message);
        return;
      }
      
      if (result.data) {
        setLeadNotes(prev => [result.data!, ...prev]);
        setNewNote('');
        
        // Create activity log
        await createLeadActivity(selectedLead.id, user.id, 'note_added', 'Anteckning tillagd');
        loadLeadDetails(selectedLead.id);
      }
      success('Anteckning tillagd', 'Anteckning har sparats');
    } catch (err) {
      console.error('Error adding note:', err);
      showError('Anteckningsfel', 'Kunde inte lägga till anteckning.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    
    try {
      const result = await updateLeadNote(noteId, editingNoteContent.trim());
      
      if (result.error) {
        showError('Uppdateringsfel', result.error.message);
        return;
      }
      
      if (result.data) {
        setLeadNotes(prev => prev.map(note => 
          note.id === noteId ? result.data! : note
        ));
        setEditingNoteId(null);
        setEditingNoteContent('');
      }
    } catch (err) {
      console.error('Error updating note:', err);
      showError('Uppdateringsfel', 'Kunde inte uppdatera anteckning.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Ta bort anteckning',
      message: 'Är du säker på att du vill ta bort denna anteckning? Detta kan inte ångras.',
      onConfirm: () => confirmDeleteNote(noteId)
    });
  };

  const confirmDeleteNote = async (noteId: string) => {
    try {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      const result = await deleteLeadNote(noteId);
      
      if (result.error) {
        showError('Borttagningsfel', result.error.message);
        return;
      }
      
      setLeadNotes(prev => prev.filter(note => note.id !== noteId));
      success('Anteckning borttagen', 'Anteckningen har tagits bort');
    } catch (err) {
      console.error('Error deleting note:', err);
      showError('Borttagningsfel', 'Kunde inte ta bort anteckning.');
    }
  };

  const handleConvertToQuote = async () => {
    if (!selectedLead || !user) return;
    
    try {
      // Create activity log
      await createLeadActivity(
        selectedLead.id, 
        user.id, 
        'converted_to_quote', 
        'Lead konverterad till offert'
      );
      
      // Update lead status to qualified if not already
      if (selectedLead.status !== 'qualified') {
        await updateLead(selectedLead.id, { status: 'qualified' });
        
        // Update local state
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === selectedLead.id 
              ? { ...lead, status: 'qualified' as LeadStatus }
              : lead
          )
        );
        
        setSelectedLead(prev => prev ? { ...prev, status: 'qualified' as LeadStatus } : null);
      }
      
      // Reload activities
      loadLeadDetails(selectedLead.id);
      
      // Here you would typically navigate to the quote creation page
      // For now, we'll just show a success message
      success('Lead konverterad', 'Lead har konverterats till offert');
    } catch (err) {
      console.error('Error converting to quote:', err);
      showError('Konverteringsfel', 'Kunde inte konvertera lead till offert.');
    }
  };

  const handleScheduleMeeting = () => {
    if (!selectedLead) return;
    
    // Create calendar event data and navigate to calendar
    const eventData = {
      title: `Möte: ${selectedLead.title}`,
      type: 'meeting',
      related_lead_id: selectedLead.id,
      description: `Möte angående lead: ${selectedLead.title}`
    };
    
    // Store in sessionStorage for calendar to pick up
    sessionStorage.setItem('pendingCalendarEvent', JSON.stringify(eventData));
    
    // Navigate to calendar
    window.location.href = '/kalender';
    success('Navigerar till kalender', 'Möte förberett i kalendern');
  };
  
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus, oldStatus: LeadStatus) => {
    if (!user) return;
    
    try {
      // Create activity log for status change
      const statusLabels = {
        new: 'Ny',
        contacted: 'Kontaktad',
        qualified: 'Kvalificerad',
        won: 'Vunnen',
        lost: 'Förlorad'
      };
      
      const description = `Status ändrad från ${statusLabels[oldStatus]} till ${statusLabels[newStatus]}`;
      await createLeadActivity(leadId, user.id, 'status_change', description);
      
      // Reload activities if this lead is currently selected
      if (selectedLead && selectedLead.id === leadId) {
        loadLeadDetails(leadId);
      }
    } catch (err) {
      console.error('Error logging status change:', err);
    }
  };

  const handleLeadClick = async (lead: LeadWithRelations) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
    setActiveTab('details');
    await loadLeadDetails(lead.id);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'status_change': return Activity;
      case 'assignment_change': return User;
      case 'note_added': return MessageSquare;
      case 'converted_to_quote': return QuoteIcon;
      default: return Clock;
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.source?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssigned = filterAssigned === 'all' || 
      (filterAssigned === 'unassigned' && !lead.assigned_to_user_id) ||
      (filterAssigned === 'assigned' && lead.assigned_to_user_id);
    
    return matchesSearch && matchesAssigned;
  });

  // Organize leads by status
  const organizedColumns = columns.map(column => ({
    ...column,
    leads: filteredLeads.filter(lead => lead.status === column.id)
  }));

  if (loading) {
    return (
      <LoadingSpinner fullScreen text="Laddar leads..." />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Kunde inte ladda leads</h3>
          <p className="text-gray-600 mb-4">Ett fel inträffade vid hämtning av data</p>
          <button 
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Lead Management</h1>
            <HelpTooltip 
              content="Hantera leads genom hela säljprocessen. Dra och släpp leads mellan kolumner för att ändra status."
              title="Lead Management"
              position="bottom"
            />
          </div>
          <p className="mt-2 text-gray-600">
            Hantera leads genom hela säljprocessen ({leads.length} totalt)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <ExportButton data={leads} filename="leads" title="Exportera" />
          <button
            onClick={loadData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Uppdatera
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border overflow-x-auto">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Sök leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alla tilldelningar</option>
            <option value="assigned">Tilldelade</option>
            <option value="unassigned">Ej tilldelade</option>
          </select>
        </div>
        
        {(searchTerm || filterAssigned !== 'all') && (
          <div className="mt-3 text-sm text-gray-600">
            Visar {filteredLeads.length} av {leads.length} leads
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 min-h-[600px] overflow-x-auto">
        {organizedColumns.map((column) => (
          <div
            key={column.id}
            className={`rounded-lg border-2 border-dashed p-4 min-w-[280px] ${column.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{column.title}</h3>
              <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                {column.leads.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {column.leads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onClick={() => handleLeadClick(lead)}
                  className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-all duration-200 touch-manipulation"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {lead.title}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeadStatusColor(lead.status)}`}>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                  
                  {lead.customer && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <User className="w-3 h-3 mr-1" />
                      {lead.customer.name}
                    </div>
                  )}
                  
                  {lead.estimated_value && (
                    <div className="flex items-center text-sm text-green-600 mb-2">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {formatCurrency(lead.estimated_value)}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {lead.created_at ? `${getDaysAgo(lead.created_at)} dagar` : 'Okänt'}
                    </div>
                    {lead.source && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {lead.source}
                      </div>
                    )}
                  </div>
                  
                  {lead.assigned_to && (
                    <div className="mt-2 text-xs text-gray-600">
                      Tilldelad: {lead.assigned_to.full_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lägg till Lead</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  required
                  value={addLeadForm.title}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Lead-titel"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Företag/Kontakt
                </label>
                <input
                  type="text"
                  value={addLeadForm.customer_name}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Företagsnamn eller kontaktperson"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post
                </label>
                <input
                  type="email"
                  value={addLeadForm.email}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kontakt@företag.se"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={addLeadForm.phone_number}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+46 70 123 45 67"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={addLeadForm.description}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv lead och behov..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uppskattat värde (SEK)
                </label>
                <input
                  type="number"
                  value={addLeadForm.estimated_value}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, estimated_value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="50000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Källa
                </label>
                <input
                  type="text"
                  value={addLeadForm.source}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Webbsida, referral, mässa..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tilldela till
                </label>
                <select
                  value={addLeadForm.assigned_to_user_id}
                  onChange={(e) => setAddLeadForm(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Välj teammedlem (valfritt)</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.role === 'admin' ? 'Administratör' : member.role === 'sales' ? 'Säljare' : 'Medarbetare'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Skapa Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lead Detaljer</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setActiveTab('details');
                  setNewNote('');
                  setEditingNoteId(null);
                  setEditingNoteContent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'details', label: 'Detaljer', icon: FileText },
                  { id: 'notes', label: 'Anteckningar', icon: MessageSquare },
                  { id: 'activity', label: 'Aktivitet', icon: Activity }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        flex items-center py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                      {tab.id === 'notes' && leadNotes.length > 0 && (
                        <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                          {leadNotes.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">{selectedLead.title}</h4>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getLeadStatusColor(selectedLead.status)}`}>
                      {LEAD_STATUS_LABELS[selectedLead.status]}
                    </span>
                  </div>
                  
                  {selectedLead.description && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Beskrivning</h5>
                      <p className="text-gray-700">{selectedLead.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Kontaktinformation</h5>
                      <div className="space-y-2">
                        {selectedLead.customer && (
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.customer.name}
                          </div>
                        )}
                        {selectedLead.customer?.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.customer.email}
                          </div>
                        )}
                        {selectedLead.customer?.phone_number && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.customer.phone_number}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Lead Information</h5>
                      <div className="space-y-2">
                        {selectedLead.estimated_value && (
                          <div className="flex items-center text-sm">
                            <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                            {formatCurrency(selectedLead.estimated_value)}
                          </div>
                        )}
                        {selectedLead.source && (
                          <div className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedLead.source}
                          </div>
                        )}
                        {selectedLead.created_at && (
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            Skapad för {getDaysAgo(selectedLead.created_at)} dagar sedan
                          </div>
                        )}
                        {selectedLead.assigned_to && (
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            Tilldelad: {selectedLead.assigned_to.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Tilldelning</h5>
                    <div className="flex items-center space-x-3">
                      <select
                        value={selectedLead.assigned_to_user_id || ''}
                        onChange={(e) => handleAssignmentChange(selectedLead.id, e.target.value)}
                        disabled={isUpdatingAssignment}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Ej tilldelad</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name} ({member.role === 'admin' ? 'Administratör' : member.role === 'sales' ? 'Säljare' : 'Medarbetare'})
                          </option>
                        ))}
                      </select>
                      {isUpdatingAssignment && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Välj en teammedlem för att tilldela denna lead
                    </p>
                  </div>
                </div>
              )}
              
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {/* Add Note Section */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Lägg till anteckning</h5>
                    <div className="space-y-3">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Skriv din anteckning här..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isAddingNote}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAddingNote ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Lägg till
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes List */}
                  <div className="space-y-4">
                    {leadNotes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>Inga anteckningar ännu</p>
                        <p className="text-sm">Lägg till din första anteckning ovan</p>
                      </div>
                    ) : (
                      leadNotes.map((note) => (
                        <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {note.user?.full_name || 'Okänd användare'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {note.created_at ? formatDateTime(note.created_at) : 'Okänt datum'}
                                </p>
                              </div>
                            </div>
                            {note.user_id === user?.id && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                  }}
                                  className="text-gray-400 hover:text-blue-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteContent('');
                                  }}
                                  className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                  Avbryt
                                </button>
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Spara
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {leadActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Ingen aktivitet ännu</p>
                      <p className="text-sm">Aktiviteter visas här när åtgärder utförs</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leadActivities.map((activity) => {
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
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setActiveTab('details');
                    setNewNote('');
                    setEditingNoteId(null);
                    setEditingNoteContent('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Stäng
                </button>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={handleScheduleMeeting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Boka Möte
                  </button>
                  <button 
                    onClick={handleConvertToQuote}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    <QuoteIcon className="w-4 h-4 mr-2" />
                    Konvertera till Offert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
}

export default LeadKanban;