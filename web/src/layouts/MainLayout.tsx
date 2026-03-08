import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  WaterDrop as WaterIcon,
  Grass as CropIcon,
  ShowChart as ForecastIcon,
  Agriculture as OptimizeIcon,
  Agriculture as FarmerIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Sensors as SensorsIcon,
  AutoGraph as AdaptiveIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { DRAWER_WIDTH } from '@config/constants';
import { ROUTES } from '@config/routes';
import { useAuth } from '@contexts/AuthContext';

type MenuItemDefinition = {
  text: string;
  icon: ReactNode;
  path: string;
};

const COLLAPSED_DRAWER_WIDTH = 84;
const DRAWER_COLLAPSE_STATE_KEY = 'mainLayoutDrawerCollapsed';

const defaultMenuItems: MenuItemDefinition[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: ROUTES.HOME },
  { text: 'Irrigation', icon: <WaterIcon />, path: ROUTES.IRRIGATION.ROOT },
  { text: 'Sensor Telemetry', icon: <SensorsIcon />, path: ROUTES.IRRIGATION.TELEMETRY },
  { text: 'Crop Health', icon: <CropIcon />, path: ROUTES.CROP_HEALTH.ROOT },
  { text: 'Forecasting', icon: <ForecastIcon />, path: ROUTES.FORECASTING.ROOT },
  { text: 'Optimization', icon: <OptimizeIcon />, path: ROUTES.OPTIMIZATION.ROOT },
];

const farmerMenuItems: MenuItemDefinition[] = [
  { text: 'Farmer Portal', icon: <FarmerIcon />, path: ROUTES.FARMER.ROOT },
  { text: 'Crop Fields', icon: <CropIcon />, path: ROUTES.IRRIGATION.CROP_FIELDS },
  { text: 'Scenarios', icon: <ForecastIcon />, path: ROUTES.OPTIMIZATION.SCENARIOS },
  { text: 'Adaptive Simulation', icon: <AdaptiveIcon />, path: ROUTES.OPTIMIZATION.ADAPTIVE },
];

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [desktopDrawerCollapsed, setDesktopDrawerCollapsed] = useState<boolean>(() => {
    const value = localStorage.getItem(DRAWER_COLLAPSE_STATE_KEY);
    return value === 'true';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isFarmer } = useAuth();
  const menuItems = isFarmer ? farmerMenuItems : defaultMenuItems;
  const desktopDrawerWidth = desktopDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  useEffect(() => {
    localStorage.setItem(DRAWER_COLLAPSE_STATE_KEY, String(desktopDrawerCollapsed));
  }, [desktopDrawerCollapsed]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopDrawerToggle = () => {
    setDesktopDrawerCollapsed((previous) => !previous);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate(ROUTES.LOGIN);
  };

  const isRouteActive = useCallback(
    (path: string): boolean =>
      location.pathname === path || (path !== ROUTES.HOME && location.pathname.startsWith(path)),
    [location.pathname]
  );

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith(ROUTES.ADMIN.ROOT)) {
      return 'User Management';
    }
    const activeItem = menuItems.find((item) => isRouteActive(item.path));
    return activeItem?.text ?? 'Smart Irrigation';
  }, [isRouteActive, location.pathname, menuItems]);

  const workspaceLabel = isAdmin ? 'Administrator workspace' : isFarmer ? 'Farmer workspace' : 'Operations workspace';

  const renderNavItem = (item: MenuItemDefinition, collapsed: boolean, closeMobileOnNavigate: boolean) => {
    const isActive = isRouteActive(item.path);
    const button = (
      <ListItemButton
        selected={isActive}
        onClick={() => {
          navigate(item.path);
          if (closeMobileOnNavigate) {
            setMobileOpen(false);
          }
        }}
        sx={{
          minHeight: 46,
          borderRadius: 2,
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 1.5,
          transition: theme.transitions.create(['padding', 'justify-content'], {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 38,
            mr: collapsed ? 0 : 1,
            justifyContent: 'center',
            color: isActive ? 'primary.main' : 'text.secondary',
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          sx={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            whiteSpace: 'nowrap',
            transition: theme.transitions.create(['opacity', 'width'], {
              duration: theme.transitions.duration.shortest,
            }),
          }}
        />
      </ListItemButton>
    );

    return (
      <ListItem key={item.text} disablePadding sx={{ display: 'block', px: 1, py: 0.25 }}>
        {collapsed ? (
          <Tooltip title={item.text} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  const drawer = (collapsed: boolean, closeMobileOnNavigate = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          minHeight: 70,
          px: collapsed ? 1.25 : 2.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Typography
          variant={collapsed ? 'subtitle1' : 'h6'}
          noWrap
          component="div"
          sx={{
            fontWeight: 800,
            color: 'primary.main',
            letterSpacing: collapsed ? 0.5 : 0.2,
          }}
        >
          {collapsed ? 'SI' : 'Smart Irrigation'}
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, py: 1 }}>
        {menuItems.map((item) => renderNavItem(item, collapsed, closeMobileOnNavigate))}
      </List>
      <Divider />
      <List sx={{ py: 1 }}>
        {isAdmin &&
          renderNavItem(
            {
              text: 'User Management',
              icon: <AdminIcon />,
              path: ROUTES.ADMIN.USERS,
            },
            collapsed,
            closeMobileOnNavigate
          )}
        {!isFarmer &&
          renderNavItem(
            {
              text: 'Settings',
              icon: <SettingsIcon />,
              path: ROUTES.SETTINGS,
            },
            collapsed,
            closeMobileOnNavigate
          )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${desktopDrawerWidth}px)` },
          ml: { sm: `${desktopDrawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: theme.transitions.create(['width', 'margin'], {
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar sx={{ gap: 0.5 }}>
          <Tooltip title={desktopDrawerCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton
              color="inherit"
              aria-label={desktopDrawerCollapsed ? 'expand sidebar' : 'collapse sidebar'}
              edge="start"
              onClick={handleDesktopDrawerToggle}
              sx={{ mr: 0.5, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              {desktopDrawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {pageTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
              {workspaceLabel}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
              {user?.username}
            </Typography>
            {isAdmin && (
              <Chip label="Admin" size="small" color="error" variant="outlined" />
            )}
            {!isAdmin && isFarmer && (
              <Chip label="Farmer" size="small" color="success" variant="outlined" />
            )}
          </Box>
          
          <IconButton onClick={handleMenuOpen} aria-label="user account menu">
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate(ROUTES.PROFILE); }}>
              <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: desktopDrawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer(false, true)}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: desktopDrawerWidth,
              overflowX: 'hidden',
              borderRight: '1px solid',
              borderColor: 'divider',
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.standard,
              }),
            },
          }}
          open
        >
          {drawer(desktopDrawerCollapsed && !isMobile)}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${desktopDrawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
