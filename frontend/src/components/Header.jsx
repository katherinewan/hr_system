import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
// Lucide
import { 
  Users, 
  Calendar, 
  FileHeart, 
  CircleDollarSign, 
  Settings, 
  LogOut, 
  Building2, 
  Landmark, 
  Smile, 
  ContactRound,
  Home,
  Bell,
  User,
  Clock,
  History
} from 'lucide-react';
// logo
import logo from '../assets/Logo.png';

export default function ButtonAppBar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  // 模擬上次登入時間（在實際應用中，這應該從後端獲取）
  const [lastLoginTime] = React.useState(new Date(Date.now() - 2 * 60 * 60 * 1000)); // 2小時前

  // 更新時鐘
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 調試：顯示當前路徑
  React.useEffect(() => {
    console.log('Current path:', location.pathname);
  }, [location.pathname]);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  // 處理導航點擊
  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    try {
      navigate(path);
      setDrawerOpen(false);
      console.log('Navigation successful to:', path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // 處理登出
  const handleLogout = () => {
    console.log('Logout clicked');

    // 清除 localStorage 中的登入資料
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('rememberedStaffId');
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }

    // 通知 App 或其他組件登出
    window.dispatchEvent(new Event('logout'));

    // 導向登入頁
    navigate('/App'); // 確保 Router 中有 /login 對應到 Loginform.jsx
  };


  // 格式化時間
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatLastLogin = (date) => {
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Home />, path: '/', category: 'main' },
    { text: 'Staff Management', icon: <Users />, path: '/staffs', category: 'hr' },
    { text: 'User Accounts', icon: <ContactRound />, path: '/user-accounts', category: 'hr' },
    { text: 'Attendance', icon: <Calendar />, path: '/attendance', category: 'hr' }, 
    { text: 'Leave Management', icon: <FileHeart />, path: '/leave-management', category: 'hr' }, 
    { text: 'Salary', icon: <CircleDollarSign />, path: '/salary', category: 'payroll' },
    { text: 'Payroll', icon: <Landmark />, path: '/payroll', category: 'payroll' },
    { text: 'Position', icon: <Smile />, path: '/position', category: 'org' },
    { text: 'Department', icon: <Building2 />, path: '/department', category: 'org' },
    { text: 'Settings', icon: <Settings />, path: '/settings', category: 'system' },
    { text: 'Sign Out', icon: <LogOut />, path: '/logout', category: 'auth', isLogout: true }
  ];

  const getCategoryTitle = (category) => {
    switch (category) {
      case 'main': return 'Dashboard';
      case 'hr': return 'Human Resources';
      case 'payroll': return 'Payroll & Finance';
      case 'org': return 'Organization';
      case 'system': return 'System';
      case 'auth': return 'Account';
      default: return '';
    }
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const sidebarContent = (
    <Box
      sx={{ 
        width: 280,
        background: 'linear-gradient(180deg, #254E70 0%, #799496 100%)',
        color: 'white'
      }}
      role="presentation"
    >
      {/* Sidebar Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: 45, 
            height: 45, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src={logo} width="45px" alt="HRNet Logo" style={{borderRadius:"5px"}}/>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              fontSize: '1.1rem',
              letterSpacing: '-0.5px'
            }}>
              HRNet
            </Typography>
            <Typography variant="caption" sx={{ 
              opacity: 0.8,
              fontSize: '0.75rem'
            }}>
              Human Resources System
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {Object.entries(groupedItems).map(([category, items]) => (
          <Box key={category} sx={{ mb: 2 }}>
            <Typography variant="overline" sx={{ 
              px: 3, 
              py: 1, 
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: 600,
              opacity: 0.7,
              letterSpacing: '1px'
            }}>
              {getCategoryTitle(category)}
            </Typography>
            <List sx={{ py: 0 }}>
              {items.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton 
                    onClick={() => item.isLogout ? handleLogout() : handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      mx: 1.5,
                      borderRadius: '12px',
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        }
                      },
                      '&:hover': {
                        backgroundColor: item.isLogout 
                          ? 'rgba(239, 68, 68, 0.1)' 
                          : 'rgba(255, 255, 255, 0.08)',
                        color: item.isLogout ? '#fca5a5' : 'inherit'
                      },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: 'inherit',
                      minWidth: '40px'
                    }}>
                      {React.cloneElement(item.icon, { size: 20 })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: location.pathname === item.path ? 600 : 500
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #254E70 0%, #799496 50%, #e9eb9e 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              mr: 2,
              borderRadius: '12px',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)'
              }
            }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}>
              <img src={logo} width="45px" alt="Company Logo" style={{borderRadius:"5px"}}/>
            </Box>
            <Box>
              <Typography variant="h6" component="div" sx={{ 
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.5px',
                lineHeight: 1
              }}>
                HRNet
              </Typography>
              <Typography variant="caption" sx={{ 
                opacity: 0.8,
                fontSize: '0.7rem',
                lineHeight: 1
              }}>
                Human Resources System
              </Typography>
            </Box>
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Clock and Last Login Information */}
            <Box className="header-time-display">
              {/* Current Time */}
              <Box className="current-time-section">
                <Box className="time-content">
                  <Typography variant="body2" className="current-time">
                    {formatTime(currentTime)}
                  </Typography>
                  <Typography variant="caption" className="current-date">
                    {formatDate(currentTime)}
                  </Typography>
                </Box>
              </Box>

              <Divider className="time-divider" />

              {/* Last Login */}
              <Box className="last-login-section">
                <History size={14} className="history-icon" />
                <Box className="last-login-content">
                  <Typography variant="caption" className="last-login-label">
                    上次登入
                  </Typography>
                  <Typography variant="caption" className="last-login-time">
                    {formatLastLogin(lastLoginTime)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            border: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
      >
        {sidebarContent}
      </Drawer>
    </Box>
  );
};