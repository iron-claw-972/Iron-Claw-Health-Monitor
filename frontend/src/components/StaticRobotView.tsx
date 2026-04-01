import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

interface StaticRobotViewProps {
  statusColors?: { [partName: string]: string };
  height?: string;
  onCategoryClick?: (catName: string) => void;
}

// These coordinates are percentages (0-100) relative to the image container
// Remapped for IronClawHealthDashboard.png
const SUBSYSTEM_LOCATIONS: { [key: string]: { x: string, y: string, label: string, showLabel?: boolean } } = {
  'Climber': { x: '30%', y: '13.5%', label: 'Climber' },
  'Shooter': { x: '30%', y: '30.5%', label: 'Shooter' },
  'Spindexer': { x: '30%', y: '49%', label: 'Spindexer' },
  'Intake': { x: '30%', y: '67%', label: 'Intake' },
  'Drivetrain': { x: '30%', y: '84%', label: 'Drivetrain' },
  'Power Subsystem': { x: '21%', y: '95%', label: 'Power', showLabel: true },
  '972_Valence_Platform': { x: '30%', y: '95%', label: 'Platform', showLabel: true },
  'Vision': { x: '39%', y: '95%', label: 'Vision', showLabel: true },
};

const StaticRobotView: React.FC<StaticRobotViewProps> = ({ statusColors = {}, height = '600px', onCategoryClick }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height, 
      bgcolor: '#1a1a1a', 
      borderRadius: '8px', 
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      border: '1px solid #333'
    }}>
      {/* Background Image */}
      <Box
        component="img"
        src={`/IronClawHealthDashboard.png?t=${new Date().getTime()}`}
        alt="Robot View"
        sx={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          opacity: 1,
          border: '1px solid #444', 
          transition: 'transform 0.3s',
          '&:hover': { transform: 'scale(1.01)' }
        }}
      />

      {/* Overlay for Subsystem Indicators */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        pointerEvents: 'none' 
      }}>
        {Object.entries(SUBSYSTEM_LOCATIONS).map(([name, loc]) => {
          const color = statusColors[name] || '#9e9e9e';
          const isError = color === '#f44336' || color === 'red';
          
          return (
            <Tooltip key={name} title={`${loc.label} Status`}>
              <Box
                onClick={() => onCategoryClick && onCategoryClick(name)}
                sx={{
                  position: 'absolute',
                  left: loc.x,
                  top: loc.y,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'auto' 
                }}
              >
                <Box
                  sx={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    bgcolor: color,
                    boxShadow: isError ? `0 0 25px ${color}` : `0 0 15px ${color}`,
                    border: '3px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isError ? 'pulse 1.2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.4)', opacity: 0.6 },
                      '100%': { transform: 'scale(1)', opacity: 1 },
                    }
                  }}
                >
                    {isError && (
                        <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>!</Typography>
                    )}
                </Box>
                {loc.showLabel && (
                  <Typography variant="caption" sx={{ 
                      color: 'white', 
                      mt: 0.5, 
                      fontWeight: 'bold', 
                      fontSize: '12px', 
                      textShadow: '0px 0px 6px rgba(0,0,0,1)',
                      bgcolor: 'rgba(0,0,0,0.6)',
                      px: 1,
                      borderRadius: '4px'
                  }}>
                    {loc.label}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(0,0,0,0.5)', px: 1, borderRadius: '4px' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>
          Interactive System Map
        </Typography>
      </Box>
    </Box>
  );
};

export default StaticRobotView;
