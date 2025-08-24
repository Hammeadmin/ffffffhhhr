import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Users,
  Users2,
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  Activity,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  Package,
  Star,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import CommunicationPanel from './CommunicationPanel';
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderNotes,
  createOrderNote,
  getOrderActivities,
  type OrderWithRelations,
  type OrderFilters
} from '../lib/orders';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getCustomers, getTeamMembers, formatCurrency, formatDate } from '../lib/database';
import { 
  ORDER_STATUS_LABELS, 
  getOrderStatusColor, 
  JOB_TYPE_LABELS,
  TEAM_SPECIALTY_LABELS,
  getTeamSpecialtyColor,
  getJobTypeColor,
  type OrderStatus, 
  type Customer, 
  type UserProfile,
  type JobType,
  type AssignmentType
} from '../types/database';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import ConfirmDialog from './ConfirmDialog';
import OrderStatusDropdown from './OrderStatusDropdown';
import OrderStatusBadge from './OrderStatusBadge';
import StatusChangeHistory from './StatusChangeHistory';
import { useNavigate } from 'react-router-dom'; // Add this line
import { getOrderCommunications } from "../lib/communications";
import EmailComposer from "./EmailComposer";
import SMSComposer from "./SMSComposer";
import ROTFields from '../components/ROTFields';
import ROTInformation from '../components/ROTInformation';

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

const getInitialEditFormData = (order: OrderWithRelations | null) => {
  if (!order) {
    return {
      id: '',
      title: '',
      description: '',
      job_description: '',
      job_type: 'allmänt' as JobType,
      value: '',
      estimated_hours: '',
      complexity_level: '3',
      assignment_type: 'individual' as AssignmentType,
      assigned_to_user_id: '',
      assigned_to_team_id: '',
      include_rot: false,
      rot_personnummer: null,
      rot_organisationsnummer: null,
      rot_fastighetsbeteckning: null,
      rot_amount: 0
    };
  }

  return {
    id: order.id,
    title: order.title || '',
    description: order.description || '',
    job_description: order.job_description || '',
    job_type: order.job_type || 'allmänt',
    value: order.value?.toString() || '',
    estimated_hours: order.estimated_hours?.toString() || '',
    complexity_level: order.complexity_level?.toString() || '3',
    assignment_type: order.assignment_type || 'individual',
    assigned_to_user_id: order.assigned_to_user_id || '',
    assigned_to_team_id: order.assigned_to_team_id || '',
    include_rot: order.include_rot || false,
    rot_personnummer: order.rot_personnummer || null,
    rot_organisationsnummer: order.rot_organisationsnummer || null,
    rot_fastighetsbeteckning: order.rot_fastighetsbeteckning || null,
    rot_amount: order.rot_amount || 0
  };
};

function OrderKanban() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'history' | 'communication'>('details');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isSmsComposerOpen, setIsSmsComposerOpen] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  
  const fetchCommunications = async (orderId: string) => {
  setLoadingCommunications(true);
  try {
    // getOrderCommunications returns an object with a data property
    const { data: comms, error } = await getOrderCommunications(orderId);
    if (error) {
      throw error;
    }
    setCommunications(comms || []); // Set the fetched communications to state
  } catch (error) {
    console.error("Error fetching communications:", error);
    showError('Fel', 'Kunde inte ladda kommunikationshistorik.');
  } finally {
    setLoadingCommunications(false);
  }
};
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    job_description: '',
    job_type: 'allmänt' as JobType,
    customer_id: '',
    value: '',
    estimated_hours: '',
    complexity_level: '3',
    assignment_type: 'individual' as AssignmentType,
    assigned_to_user_id: '',
    assigned_to_team_id: '',
    source: '',
    include_rot: false,
    rot_personnummer: null,
    rot_organisationsnummer: null,
    rot_fastighetsbeteckning: null,
    rot_amount: 0
  });
  const [formLoading, setFormLoading] = useState(false);

  const [editFormData, setEditFormData] = useState(getInitialEditFormData(null));
  
  // Filter states
  const [filters, setFilters] = useState<OrderFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Notes and activities
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [orderActivities, setOrderActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const kanbanColumns = [
    { status: 'öppen_order', title: 'Öppna Ordrar', color: 'border-blue-200 bg-blue-50' },
    { status: 'bokad_bekräftad', title: 'Bokade Ordrar', color: 'border-green-200 bg-green-50' },
    { status: 'ej_slutfört', title: 'Ej Slutförda', color: 'border-yellow-200 bg-yellow-50' },
    { status: 'redo_fakturera', title: 'Redo att Fakturera', color: 'border-purple-200 bg-purple-50' },
    { status: 'avbokad_kund', title: 'Avbokade', color: 'border-red-200 bg-red-50' }
  ];

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (selectedOrder && showEditModal) {
      setEditFormData(getInitialEditFormData(selectedOrder));
    }
  }, [selectedOrder, showEditModal]);

 const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Correctly destructure all four results from Promise.all
      const [ordersResult, customersResult, teamMembersResult, teamsResult] = await Promise.all([
        getOrders(DEMO_ORG_ID, filters),
        getCustomers(DEMO_ORG_ID),
        getTeamMembers(DEMO_ORG_ID),
        getTeams(DEMO_ORG_ID)
      ]);

      if (ordersResult.error) {
        setError(ordersResult.error.message);
        return;
      }
      setOrders(ordersResult.data || []);

      if (customersResult.error) {
        setError(customersResult.error.message);
      } else {
        setCustomers(customersResult.data || []);
      }

      if (teamMembersResult.error) {
        setError(teamMembersResult.error.message);
      } else {
        setTeamMembers(teamMembersResult.data || []);
      }

      // Correctly set the teams state with the data from getTeams
      if (teamsResult.error) {
        setError(teamsResult.error.message);
      } else {
        setTeams(teamsResult.data || []);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.customer_id || !formData.job_description.trim()) {
      showError('Fel', 'Titel, kund och jobbeskrivning är obligatoriska fält.');
      return;
    }

    // Validate assignment
    if (formData.assignment_type === 'individual' && !formData.assigned_to_user_id) {
      showError('Fel', 'Välj en person för individuell tilldelning.');
      return;
    }

    if (formData.assignment_type === 'team' && !formData.assigned_to_team_id) {
      showError('Fel', 'Välj ett team för team-tilldelning.');
      return;
    }

    try {
      setFormLoading(true);

      const orderData = {
        organisation_id: DEMO_ORG_ID,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        job_description: formData.job_description.trim(),
        job_type: formData.job_type,
        customer_id: formData.customer_id,
        value: formData.value ? parseFloat(formData.value) : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        complexity_level: parseInt(formData.complexity_level),
        assignment_type: formData.assignment_type,
        assigned_to_user_id: formData.assignment_type === 'individual' ? formData.assigned_to_user_id : null,
        assigned_to_team_id: formData.assignment_type === 'team' ? formData.assigned_to_team_id : null,
        source: formData.source.trim() || null,
        status: 'öppen_order' as OrderStatus,
            include_rot: formData.include_rot,
    rot_personnummer: formData.rot_personnummer,
    rot_organisationsnummer: formData.rot_organisationsnummer,
    rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
    rot_amount: formData.rot_amount
      };

      const result = await createOrder(orderData);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Order skapad framgångsrikt!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating order:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid skapande av order.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.title.trim() || !editFormData.job_description.trim()) {
      showError('Fel', 'Titel och jobbeskrivning är obligatoriska fält.');
      return;
    }

    try {
      setFormLoading(true);

      const orderUpdates = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim() || null,
        job_description: editFormData.job_description.trim(),
        job_type: editFormData.job_type,
        value: editFormData.value ? parseFloat(editFormData.value) : null,
        estimated_hours: editFormData.estimated_hours ? parseFloat(editFormData.estimated_hours) : null,
        complexity_level: parseInt(editFormData.complexity_level),
        assignment_type: editFormData.assignment_type,
        assigned_to_user_id: editFormData.assignment_type === 'individual' ? editFormData.assigned_to_user_id : null,
        assigned_to_team_id: editFormData.assignment_type === 'team' ? editFormData.assigned_to_team_id : null,
            include_rot: editFormData.include_rot,
    rot_personnummer: editFormData.rot_personnummer,
    rot_organisationsnummer: editFormData.rot_organisationsnummer,
    rot_fastighetsbeteckning: editFormData.rot_fastighetsbeteckning,
    rot_amount: editFormData.rot_amount
      };

      const result = await updateOrder(editFormData.id, orderUpdates);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Order uppdaterad!');
      setShowEditModal(false);
      setSelectedOrder(null);
      await loadData();
    } catch (err) {
      console.error('Error updating order:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid uppdatering av order.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Show confirmation dialog for certain status changes
    const confirmationMessages: Record<OrderStatus, string> = {
      öppen_order: `Är du säker på att du vill ändra status till "Öppen Order"?`,
      bokad_bekräftad: `Bekräfta att ordern "${order.title}" är bokad och bekräftad?`,
      avbokad_kund: `Bekräfta att kunden har avbokat ordern "${order.title}"?`,
      ej_slutfört: `Markera ordern "${order.title}" som ej slutförd?`,
      redo_fakturera: `Bekräfta att ordern "${order.title}" är redo att fakturera?`
    };

    if (!confirm(confirmationMessages[newStatus])) {
      return;
    }

    try {
      setLoading(true); // Visually indicate loading
      const result = await updateOrder(orderId, { status: newStatus });

      if (result.error) {
        showError('Fel', result.error.message);
      } else {
        success('Framgång', 'Order-status uppdaterad!');
        // Update local state for instant feedback before full reload
        setOrders(prevOrders =>
          prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid uppdatering av status.');
    } finally {
      // Reload all data to ensure consistency
      await loadData();
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const result = await deleteOrder(orderToDelete.id);

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      success('Framgång', 'Order borttagen framgångsrikt!');
      setShowDeleteDialog(false);
      setOrderToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting order:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid borttagning av order.');
    }
  };

  const handleOrderClick = async (order: OrderWithRelations) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setActiveTab('details');

    // Load notes and activities
    try {
      const [notesResult, activitiesResult] = await Promise.all([
        getOrderNotes(order.id),
        getOrderActivities(order.id),
        fetchCommunications(order.id)
      ]);

      if (notesResult.data) setOrderNotes(notesResult.data);
      if (activitiesResult.data) setOrderActivities(activitiesResult.data);
    } catch (err) {
      console.error('Error loading order details:', err);
    }
  };

  const handleAddNote = async () => {
    if (!selectedOrder || !newNote.trim() || !user) return;

    try {
      setAddingNote(true);

      const result = await createOrderNote({
        order_id: selectedOrder.id,
        user_id: user.id,
        content: newNote.trim()
      });

      if (result.error) {
        showError('Fel', result.error.message);
        return;
      }

      setNewNote('');
      // Reload notes
      const notesResult = await getOrderNotes(selectedOrder.id);
      if (notesResult.data) setOrderNotes(notesResult.data);
    } catch (err) {
      console.error('Error adding note:', err);
      showError('Fel', 'Ett oväntat fel inträffade vid tillägg av anteckning.');
    } finally {
      setAddingNote(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      job_description: '',
      job_type: 'allmänt',
      customer_id: '',
      value: '',
      estimated_hours: '',
      complexity_level: '3',
      assignment_type: 'individual',
      assigned_to_user_id: '',
      assigned_to_team_id: '',
      source: '',
      include_rot: false,
      rot_personnummer: null,
      rot_organisationsnummer: null,
      rot_fastighetsbeteckning: null,
      rot_amount: 0
    });
  };

  const getOrdersForStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  const handleDragStart = (e: React.DragEvent, order: OrderWithRelations) => {
    e.dataTransfer.setData('text/plain', order.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: OrderStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    const order = orders.find(o => o.id === orderId);
    
    if (order && order.status !== targetStatus) {
      await handleStatusChange(orderId, targetStatus);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Ordrar</h1>
          <LoadingSpinner />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Ordrar</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-10 h-10 text-red-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Kunde inte ladda ordrar</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <button 
              onClick={loadData}
              className="ml-auto inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
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
            <Package className="w-8 h-8 mr-3 text-blue-600" />
            Ordrar
          </h1>
          <p className="mt-2 text-gray-600">
            Hantera alla dina ordrar från första kontakt till fakturering
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till Order
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sök</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sök ordrar..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tilldelad till</label>
              <select
                value={filters.assignedTo || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla</option>
                <option value="unassigned">Ej tilldelad</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kund</label>
              <select
                value={filters.customer || 'all'}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla kunder</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Rensa filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kanbanColumns.map((column) => {
          const columnOrders = getOrdersForStatus(column.status);
          
          return (
            <div
              key={column.status}
              className={`rounded-lg border-2 border-dashed ${column.color} min-h-96`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status as OrderStatus)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {column.title}
                    <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {columnOrders.length}
                    </span>
                  </h3>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(columnOrders.reduce((sum, order) => sum + (order.value || 0), 0))}
                  </div>
                </div>

                <div className="space-y-3">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Inga ordrar i denna status</p>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order)}
                        onClick={() => handleOrderClick(order)}
                        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300 group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-gray-900 line-clamp-2">{order.title}</h4>
                          <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening details modal
                            setSelectedOrder(order);
                            setShowEditModal(true);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Redigera Order"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        

                        {order.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{order.description}</p>
                        )}

                        <div className="space-y-2">
                          {order.customer && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              {order.customer.name}
                            </div>
                          )}

                          {order.value && (
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                              {formatCurrency(order.value)}
                            </div>
                          )}

                          {order.job_type && (
                            <div className="flex items-center text-sm text-gray-600">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJobTypeColor(order.job_type)}`}>
                                {JOB_TYPE_LABELS[order.job_type]}
                              </span>
                            </div>
                          )}

                          {order.assignment_type === 'individual' && order.assigned_to && (
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {order.assigned_to.full_name}
                            </div>
                          )}

                          {order.assignment_type === 'team' && order.assigned_team && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Users2 className="w-4 h-4 mr-2 text-gray-400" />
                              {order.assigned_team.name}
                            </div>
                          )}

                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>

                        {/* START: New Button Logic */}
                          {order.status === 'öppen_order' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevents the card's main click event
                                navigate('/offerter', { state: { orderToQuote: order } });
                              }}
                              className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                              title="Skapa Offert"
                            >
                              <FileText className="w-3 h-3 mr-1.5" />
                              Skapa Offert
                            </button>
                          )}
                          {/* END: New Button Logic */}

                        {/* Quick Status Change on Hover */}
                        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Dra för att ändra status</span>
                            <span>Klicka för detaljer</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Redigera Order</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4">
              {/* Most form fields are the same as the create modal, but bound to `editFormData` */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jobbeskrivning *</label>
                <textarea
                  required
                  value={editFormData.job_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
    <ROTFields
        data={{
            include_rot: editFormData.include_rot,
            rot_personnummer: editFormData.rot_personnummer,
            rot_organisationsnummer: editFormData.rot_organisationsnummer,
            rot_fastighetsbeteckning: editFormData.rot_fastighetsbeteckning,
            rot_amount: editFormData.rot_amount,
        }}
        onChange={(rotData) =>
            setEditFormData(prev => ({ ...prev, ...rotData }))
        }
        totalAmount={parseFloat(editFormData.value) || 0}
    />
</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uppskattade timmar</label>
                    <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editFormData.estimated_hours}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Komplexitet (1-5)</label>
                    <select
                    value={editFormData.complexity_level}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, complexity_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                    <option value="1">1 - Mycket enkelt</option>
                    <option value="2">2 - Enkelt</option>
                    <option value="3">3 - Medel</option>
                    <option value="4">4 - Svårt</option>
                    <option value="5">5 - Mycket svårt</option>
                    </select>
                </div>
              </div>

              {/* Assignment Section */}
                <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-4">Tilldelning</h4>
                    <div className="space-y-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                    type="radio"
                                    value="individual"
                                    checked={editFormData.assignment_type === 'individual'}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, assignment_type: e.target.value as AssignmentType, assigned_to_team_id: '' }))}
                                    className="h-4 w-4 text-blue-600"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Individ</span>
                                </label>
                                <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="team"
                                    checked={editFormData.assignment_type === 'team'}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, assignment_type: e.target.value as AssignmentType, assigned_to_user_id: '' }))}
                                    className="h-4 w-4 text-blue-600"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Team</span>
                                </label>
                            </div>
                        </div>
                        <div>
                        {editFormData.assignment_type === 'individual' ? (
                            <select
                                value={editFormData.assigned_to_user_id || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Välj person...</option>
                                {teamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.full_name}</option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={editFormData.assigned_to_team_id || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Välj team...</option>
                                {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        )}
                        </div>
                    </div>
                </div>


              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {formLoading ? <LoadingSpinner size="sm" color="white" /> : <Save className="w-4 h-4 mr-2" />}
                  Spara ändringar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lägg till ny order</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv ordern..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kund *
                </label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Välj kund...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allmän beskrivning
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Allmän beskrivning av ordern..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jobbeskrivning *
                </label>
                <textarea
                  required
                  value={formData.job_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detaljerad beskrivning av det arbete som ska utföras..."
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
    <ROTFields
        data={{
            include_rot: formData.include_rot,
            rot_personnummer: formData.rot_personnummer,
            rot_organisationsnummer: formData.rot_organisationsnummer,
            rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
            rot_amount: formData.rot_amount,
        }}
        onChange={(rotData) =>
            setFormData(prev => ({ ...prev, ...rotData }))
        }
        totalAmount={parseFloat(formData.value) || 0}
    />
</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jobbtyp *
                  </label>
                  <select
                    required
                    value={formData.job_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_type: e.target.value as JobType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([jobType, label]) => (
                      <option key={jobType} value={jobType}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uppskattade timmar
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Komplexitet (1-5)
                  </label>
                  <select
                    value={formData.complexity_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, complexity_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1">1 - Mycket enkelt</option>
                    <option value="2">2 - Enkelt</option>
                    <option value="3">3 - Medel</option>
                    <option value="4">4 - Svårt</option>
                    <option value="5">5 - Mycket svårt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Värde (SEK)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Källa
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T.ex. Webbsida, Telefon, E-post..."
                  />
                </div>
              </div>

              {/* Assignment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">Tilldelning</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tilldelningstyp *
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assignment_type"
                          value="individual"
                          checked={formData.assignment_type === 'individual'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_team_id: '',
                            assigned_to_user_id: ''
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Tilldela individ</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assignment_type"
                          value="team"
                          checked={formData.assignment_type === 'team'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            assignment_type: e.target.value as AssignmentType,
                            assigned_to_team_id: '',
                            assigned_to_user_id: ''
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Tilldela team</span>
                      </label>
                    </div>
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.assignment_type === 'individual' ? 'Tilldela till person' : 'Tilldela till team'}
                  </label>
                  {formData.assignment_type === 'individual' ? (
                    <select
                      value={formData.assigned_to_user_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Välj person...</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formData.assigned_to_team_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Välj team...</option>
                      {teams
                        .filter(team => team.specialty === formData.job_type || team.specialty === 'allmänt')
                        .map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({TEAM_SPECIALTY_LABELS[team.specialty]})
                          </option>
                        ))}
                    </select>
                  )}
                  
                  {formData.assignment_type === 'team' && formData.job_type !== 'allmänt' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Visar team med specialitet "{JOB_TYPE_LABELS[formData.job_type]}" eller "Allmänt"
                    </p>
                  )}
                </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Skapar...</span>
                    </div>
                  ) : (
                    'Skapa Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedOrder.title}</h3>
                <OrderStatusBadge status={selectedOrder.status} size="md" className="mt-2" />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setOrderToDelete(selectedOrder);
                    setShowDeleteDialog(true);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>


{/* === ADD TAB BUTTONS HERE === */}
<div className="border-b border-gray-200">
  <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
    <button
      onClick={() => setActiveTab('details')}
      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'details'
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Detaljer & Anteckningar
    </button>
    <button
      onClick={() => setActiveTab('communication')}
      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'communication'
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      Kommunikation
    </button>
  </nav>
</div>

          
{/* === END OF TAB BUTTONS === */}

          
          {activeTab === 'details' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Orderinformation</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {selectedOrder.description && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Beskrivning:</span>
                          <p className="text-sm text-gray-900">{selectedOrder.description}</p>
                        </div>
                      )}

                      {/* ROT INFORMATION DISPLAY */}
                       {selectedOrder && selectedOrder.include_rot && (
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">ROT Information</h4>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                     <ROTInformation
                                        data={selectedOrder}
                                        totalAmount={selectedOrder.value || 0}
                                    />
                                </div>
                            </div>
                        )}
                      
                      {selectedOrder.job_description && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Jobbeskrivning:</span>
                          <p className="text-sm text-gray-900">{selectedOrder.job_description}</p>
                        </div>
                      )}
                      
                      {selectedOrder.job_type && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Jobbtyp:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getJobTypeColor(selectedOrder.job_type)}`}>
                            {JOB_TYPE_LABELS[selectedOrder.job_type]}
                          </span>
                        </div>
                      )}
                      
                      {selectedOrder.value && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Värde:</span>
                          <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.value)}</p>
                        </div>
                      )}
                      
                      {selectedOrder.estimated_hours && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Uppskattade timmar:</span>
                          <p className="text-sm text-gray-900">{selectedOrder.estimated_hours} tim</p>
                        </div>
                      )}
                      
                      {selectedOrder.complexity_level && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Komplexitet:</span>
                          <div className="flex items-center mt-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < selectedOrder.complexity_level! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              {selectedOrder.complexity_level}/5
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.source && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Källa:</span>
                          <p className="text-sm text-gray-900">{selectedOrder.source}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-sm font-medium text-gray-500">Skapad:</span>
                        <p className="text-sm text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tilldelning</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Typ:</span>
                        <p className="text-sm text-gray-900 capitalize">
                          {selectedOrder.assignment_type === 'individual' ? 'Individ' : 'Team'}
                        </p>
                      </div>
                      
                      {selectedOrder.assignment_type === 'individual' && selectedOrder.assigned_to && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Tilldelad till:</span>
                          <div className="flex items-center mt-1">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedOrder.assigned_to.full_name}</span>
                          </div>
                        </div>
                      )}
                      
                      {selectedOrder.assignment_type === 'team' && selectedOrder.assigned_team && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Tilldelat team:</span>
                          <div className="mt-1">
                            <div className="flex items-center mb-2">
                              <Users2 className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm text-gray-900">{selectedOrder.assigned_team.name}</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${getTeamSpecialtyColor(selectedOrder.assigned_team.specialty)}`}>
                                {TEAM_SPECIALTY_LABELS[selectedOrder.assigned_team.specialty]}
                              </span>
                            </div>
                            {selectedOrder.assigned_team.team_leader && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Crown className="w-3 h-3 mr-1 text-yellow-600" />
                                Ledare: {selectedOrder.assigned_team.team_leader.full_name}
                              </div>
                            )}
                            {selectedOrder.assigned_team.members && selectedOrder.assigned_team.members.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Medlemmar:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedOrder.assigned_team.members.map(member => (
                                    <span key={member.id} className="text-xs bg-white px-2 py-1 rounded border">
                                      {member.user?.full_name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  {selectedOrder.customer && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Kundinformation</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">{selectedOrder.customer.name}</span>
                        </div>
                        {selectedOrder.customer.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedOrder.customer.email}</span>
                          </div>
                        )}
                        {selectedOrder.customer.phone_number && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedOrder.customer.phone_number}</span>
                          </div>
                        )}
                        {selectedOrder.customer.city && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">{selectedOrder.customer.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Ändra status</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nuvarande status
                        </label>
                        <OrderStatusDropdown
                          currentStatus={selectedOrder.status}
                          onStatusChange={(newStatus) => handleStatusChange(selectedOrder.id, newStatus)}
                        />
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-900 mb-2">Statusbeskrivningar:</h5>
                        <div className="space-y-1 text-xs text-blue-800">
                          <p><strong>Öppen Order:</strong> Ny order som väntar på bekräftelse</p>
                          <p><strong>Bokad och Bekräftad:</strong> Order bekräftad och schemalagd</p>
                          <p><strong>Ej Slutfört:</strong> Arbetet kunde inte slutföras</p>
                          <p><strong>Redo att Fakturera:</strong> Arbetet är klart för fakturering</p>
                          <p><strong>Avbokad av Kund:</strong> Kunden har avbokat ordern</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes and Activities */}
                <div className="space-y-4">
                  {/* Status Change History */}
                  <StatusChangeHistory orderId={selectedOrder.id} />

                  {/* Add Note */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Lägg till anteckning</h4>
                    <div className="space-y-2">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Skriv en anteckning..."
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingNote ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <MessageSquare className="w-4 h-4 mr-2" />
                        )}
                        Lägg till
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {orderNotes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Anteckningar</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {orderNotes.map((note) => (
                          <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {note.user?.full_name || 'Okänd användare'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {orderActivities.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Aktiviteter</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {orderActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 text-sm">
                            <Activity className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-gray-900">{activity.description}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(activity.created_at)}
                                {activity.user && ` • ${activity.user.full_name}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div> 
              </div> 
            </div> 
          )}
          
          {activeTab === 'communication' && (
            <div className="p-6">
              <CommunicationPanel
                order={selectedOrder}
                communications={communications}
                loading={loadingCommunications}
                onSendEmail={() => setIsEmailComposerOpen(true)}
                onSendSms={() => setIsSmsComposerOpen(true)}
              />
            </div>
          )}
          
        </div> 
      </div>  
    )}
      
              
          

{isEmailComposerOpen && selectedOrder && selectedOrder.customer && (
  <EmailComposer
    order={selectedOrder}
    customer={selectedOrder.customer}
    onClose={() => setIsEmailComposerOpen(false)}
    onSend={() => {
      setIsEmailComposerOpen(false);
      fetchCommunications(selectedOrder.id); // Refresh the timeline!
      success('E-post skickat!', 'Meddelandet har lagts i kö för att skickas.');
    }}
  />
)}

{isSmsComposerOpen && selectedOrder && selectedOrder.customer && (
  <SMSComposer
    order={selectedOrder}
    customer={selectedOrder.customer}
    onClose={() => setIsSmsComposerOpen(false)}
    onSend={() => {
      setIsSmsComposerOpen(false);
      fetchCommunications(selectedOrder.id); // Refresh the timeline!
      success('SMS skickat!', 'Meddelandet har lagts i kö för att skickas.');
    }}
  />
)}
          
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setOrderToDelete(null);
        }}
        onConfirm={handleDeleteOrder}
        title="Ta bort order"
        message={`Är du säker på att du vill ta bort ordern "${orderToDelete?.title}"? Denna åtgärd kan inte ångras.`}
        confirmText="Ta bort"
        cancelText="Avbryt"
        type="danger"
      />

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <EmptyState
          type="general"
          title="Inga ordrar ännu"
          description="Kom igång genom att lägga till din första order eller vänta på att accepterade offerter automatiskt skapar ordrar."
          actionText="Lägg till Order"
          onAction={() => setShowCreateModal(true)}
        />
      )}
    </div>
  );
}

export default OrderKanban;