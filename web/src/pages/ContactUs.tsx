import { useState } from 'react';
import { Alert, Box, Button, Grid, Stack, TextField, Typography } from '@mui/material';
import PublicSiteFrame from '@components/common/PublicSiteFrame';

const CONTACTS = [
  {
    name: 'Hesara',
    role: 'F1 - IoT Smart Water',
  },
  {
    name: 'Abishek',
    role: 'F2 - Crop Health',
  },
  {
    name: 'Trishni',
    role: 'F3 - Forecasting',
  },
  {
    name: 'Dilruksha',
    role: 'F4 - ACA-O',
  },
];

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <PublicSiteFrame
      title="Contact Us"
      subtitle="Send project questions or collaboration requests to the research team."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Team Contacts
          </Typography>
          <Box sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, bgcolor: 'white' }}>
            {CONTACTS.map((contact, index) => (
              <Box
                key={contact.name}
                sx={{
                  p: 2,
                  borderBottom: index === CONTACTS.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  {contact.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {contact.role}
                </Typography>
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Send a Message
          </Typography>
          <Box component="form" sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, p: 2, bgcolor: 'white' }}>
            <Stack spacing={1.5}>
              <TextField label="Your Name" size="small" fullWidth />
              <TextField label="Email" size="small" fullWidth />
              <TextField label="Subject" size="small" fullWidth />
              <TextField label="Message" size="small" multiline minRows={4} fullWidth />
              <Button
                variant="contained"
                onClick={(event) => {
                  event.preventDefault();
                  setSubmitted(true);
                }}
              >
                Submit Inquiry
              </Button>
            </Stack>
          </Box>

          {submitted && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Thank you. Your inquiry was recorded on this page. Connect with a team member to continue.
            </Alert>
          )}
        </Grid>
      </Grid>
    </PublicSiteFrame>
  );
}
