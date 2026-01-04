/**
 * Image Upload Component
 * Allows users to upload images for crop health prediction
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { cropHealthApi } from '../api';
import type { ImagePredictionResponse } from '../types';

interface ImageUploadProps {
  onPredictionComplete?: (result: ImagePredictionResponse) => void;
}

export default function ImageUpload({ onPredictionComplete }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<ImagePredictionResponse | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setPrediction(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cropHealthApi.predictFromImage(selectedFile);
      setPrediction(result);
      onPredictionComplete?.(result);
    } catch (err: any) {
      console.error('Prediction error:', err);
      setError(err.response?.data?.detail || 'Failed to analyze image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, onPredictionComplete]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrediction(null);
    setError(null);
  }, []);

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('healthy')) {
      return <SuccessIcon sx={{ color: '#4caf50' }} />;
    } else if (status.toLowerCase().includes('mild') || status.toLowerCase().includes('moderate')) {
      return <WarningIcon sx={{ color: '#ff9800' }} />;
    } else {
      return <ErrorIcon sx={{ color: '#f44336' }} />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Manual Image Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload a crop/plant image to analyze its health using our AI model
      </Typography>

      {/* Upload Area */}
      <Box
        sx={{
          border: '2px dashed',
          borderColor: previewUrl ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: previewUrl ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.50',
          },
        }}
        component="label"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {previewUrl ? (
          <Box>
            <Box
              component="img"
              src={previewUrl}
              alt="Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 1,
                mb: 2,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {selectedFile?.name}
            </Typography>
          </Box>
        ) : (
          <Box>
            <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              Click or drag image to upload
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: JPEG, PNG, WebP (max 10MB)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          fullWidth
        >
          {isLoading ? 'Analyzing...' : 'Analyze Image'}
        </Button>
        {selectedFile && (
          <Button variant="outlined" onClick={handleClear} disabled={isLoading}>
            Clear
          </Button>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Prediction Results */}
      {prediction && (
        <Card sx={{ mt: 3 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {getStatusIcon(prediction.health_status)}
              <Typography variant="h6">Analysis Results</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Predicted Class */}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Predicted Class
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {prediction.predicted_class.replace(/_/g, ' ')}
                </Typography>
              </Box>

              {/* Confidence */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {(prediction.confidence * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={prediction.confidence * 100}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: prediction.color,
                    },
                  }}
                />
              </Box>

              {/* Status Chips */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={prediction.health_status}
                  size="small"
                  sx={{
                    bgcolor: `${prediction.color}20`,
                    color: prediction.color,
                    fontWeight: 500,
                  }}
                />
                <Chip
                  label={`Severity: ${prediction.severity}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`Risk: ${prediction.risk_level}`}
                  size="small"
                  color={
                    prediction.risk_level === 'low'
                      ? 'success'
                      : prediction.risk_level === 'medium'
                      ? 'warning'
                      : 'error'
                  }
                  variant="outlined"
                />
              </Box>

              {/* Recommendation */}
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Recommendation
                </Typography>
                <Typography variant="body2">{prediction.recommendation}</Typography>
              </Box>

              {/* Model Info */}
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                Model: {prediction.model_used ? 'MobileNetV2 (Trained)' : 'Fallback Analysis'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
}
