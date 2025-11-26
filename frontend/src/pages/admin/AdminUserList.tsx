/**
 * Admin User List Page
 * Displays all users with role and status management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Switch,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  CircularProgress,
  Alert,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { adminApi, User, AdminUserCreate, AdminUserUpdate } from '@api/auth.api';
import { useNotification } from '@contexts/NotificationContext';
import { useAuth } from '@contexts/AuthContext';

// Available roles for selection
const AVAILABLE_ROLES = ['admin', 'user', 'farmer', 'officer'];

export default function AdminUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Role edit dialog state
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<AdminUserCreate>({
    username: '',
    password: '',
    email: '',
    roles: ['user'],
    is_active: true,
  });
  const [creating, setCreating] = useState(false);

  // Edit user dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserUpdate>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { showSuccess, showError } = useNotification();
  const { user: currentUser } = useAuth();

  /**
   * Fetch users from API
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getUsers(
        page + 1, // API is 1-indexed
        rowsPerPage,
        search || undefined
      );
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to fetch users';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, showError]);

  // Fetch users on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Handle page change
   */
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Handle search
   */
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  /**
   * Handle search on Enter key
   */
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /**
   * Close role edit dialog
   */
  const handleCloseRoleDialog = () => {
    setEditRoleDialogOpen(false);
    setSelectedUser(null);
    setSelectedRoles([]);
  };

  /**
   * Save role changes
   */
  const handleSaveRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0) return;

    setUpdating(true);
    try {
      const updatedUser = await adminApi.updateUserRoles(selectedUser.id, selectedRoles);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      
      showSuccess(`Roles updated for ${updatedUser.username}`);
      handleCloseRoleDialog();
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update roles';
      showError(message);
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Open create user dialog
   */
  const handleOpenCreateDialog = () => {
    setNewUser({
      username: '',
      password: '',
      email: '',
      roles: ['user'],
      is_active: true,
    });
    setCreateDialogOpen(true);
  };

  /**
   * Close create user dialog
   */
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewUser({
      username: '',
      password: '',
      email: '',
      roles: ['user'],
      is_active: true,
    });
  };

  /**
   * Create new user
   */
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) return;

    setCreating(true);
    try {
      const createdUser = await adminApi.createUser(newUser);
      showSuccess(`User ${createdUser.username} created successfully`);
      handleCloseCreateDialog();
      fetchUsers(); // Refresh list
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to create user';
      showError(message);
    } finally {
      setCreating(false);
    }
  };

  /**
   * Open edit user dialog
   */
  const handleOpenEditDialog = (user: User) => {
    setEditingUserId(user.id);
    setEditUser({
      username: user.username,
      email: user.email || '',
      roles: user.roles,
      is_active: user.is_active,
    });
    setEditDialogOpen(true);
  };

  /**
   * Close edit user dialog
   */
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUserId(null);
    setEditUser({});
  };

  /**
   * Save user edits
   */
  const handleSaveUser = async () => {
    if (!editingUserId) return;

    setUpdating(true);
    try {
      // Build update payload - only include changed fields
      const updatePayload: AdminUserUpdate = {};
      if (editUser.username) updatePayload.username = editUser.username;
      if (editUser.email !== undefined) updatePayload.email = editUser.email || undefined;
      if (editUser.password) updatePayload.password = editUser.password;
      if (editUser.roles && editUser.roles.length > 0) updatePayload.roles = editUser.roles;
      if (editUser.is_active !== undefined) updatePayload.is_active = editUser.is_active;

      const updatedUser = await adminApi.updateUser(editingUserId, updatePayload);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      
      showSuccess(`User ${updatedUser.username} updated successfully`);
      handleCloseEditDialog();
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update user';
      showError(message);
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Delete user
   */
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      showError('Cannot delete your own account');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${user.username}?`)) {
      return;
    }

    try {
      await adminApi.deleteUser(user.id, true); // Hard delete
      showSuccess(`User ${user.username} deleted successfully`);
      fetchUsers(); // Refresh list
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to delete user';
      showError(message);
    }
  };

  /**
   * Toggle user active status
   */
  const handleToggleStatus = async (user: User) => {
    // Prevent deactivating yourself
    if (user.id === currentUser?.id) {
      showError('Cannot deactivate your own account');
      return;
    }

    try {
      const updatedUser = await adminApi.updateUserStatus(user.id, !user.is_active);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      
      showSuccess(
        `${updatedUser.username} ${updatedUser.is_active ? 'activated' : 'deactivated'}`
      );
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update status';
      showError(message);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage user accounts, roles, and access permissions
      </Typography>

      {/* Search and Refresh */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search by username or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            Search
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Add User
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchUsers} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{user.username}</Typography>
                      {user.id === currentUser?.id && (
                        <Chip
                          label="You"
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.roles.map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            size="small"
                            color={role === 'admin' ? 'error' : 'default'}
                            variant={role === 'admin' ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          user.id === currentUser?.id
                            ? 'Cannot change your own status'
                            : user.is_active
                            ? 'Click to deactivate'
                            : 'Click to activate'
                        }
                      >
                        <span>
                          <Switch
                            checked={user.is_active}
                            onChange={() => handleToggleStatus(user)}
                            disabled={user.id === currentUser?.id}
                            color="success"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Edit Role Dialog */}
      <Dialog
        open={editRoleDialogOpen}
        onClose={handleCloseRoleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Roles for {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={selectedRoles}
                onChange={(e) => setSelectedRoles(e.target.value as string[])}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {AVAILABLE_ROLES.map((role) => (
                  <MenuItem
                    key={role}
                    value={role}
                    disabled={
                      // Prevent removing your own admin role
                      selectedUser?.id === currentUser?.id &&
                      role === 'admin' &&
                      selectedRoles.includes('admin')
                    }
                  >
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedUser?.id === currentUser?.id && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You cannot remove your own admin role
              </Alert>
            )}
            {selectedRoles.length === 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                At least one role is required
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button
            onClick={handleSaveRoles}
            variant="contained"
            disabled={updating || selectedRoles.length === 0}
          >
            {updating ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
              fullWidth
              helperText="3-50 characters, letters, numbers, underscores, hyphens"
            />
            <TextField
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              fullWidth
              helperText="Minimum 6 characters"
            />
            <TextField
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={newUser.roles || ['user']}
                onChange={(e) => setNewUser({ ...newUser, roles: e.target.value as string[] })}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {AVAILABLE_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUser.is_active ?? true}
                  onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={creating || !newUser.username || !newUser.password}
          >
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={editUser.username || ''}
              onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={editUser.email || ''}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              value={editUser.password || ''}
              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              fullWidth
              helperText="Leave blank to keep current password"
            />
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={editUser.roles || []}
                onChange={(e) => setEditUser({ ...editUser, roles: e.target.value as string[] })}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {AVAILABLE_ROLES.map((role) => (
                  <MenuItem
                    key={role}
                    value={role}
                    disabled={
                      editingUserId === currentUser?.id &&
                      role === 'admin' &&
                      editUser.roles?.includes('admin')
                    }
                  >
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editUser.is_active ?? true}
                  onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })}
                  disabled={editingUserId === currentUser?.id}
                />
              }
              label="Active"
            />
            {editingUserId === currentUser?.id && (
              <Alert severity="warning">
                You cannot deactivate your own account or remove your admin role
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={updating}
          >
            {updating ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
