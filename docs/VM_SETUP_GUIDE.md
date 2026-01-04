# Azure VM Setup Guide for Jupyter Notebook

## Quick Reference Commands

### 1. Connect to VM
```bash
ssh azureuser@YOUR-VM-IP
```

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Git
```bash
sudo apt install git -y
```

### 4. Configure Git
```bash
git config --global user.name "dilrukshax"
git config --global user.email "dilndilruksha0@gmail.com"
```

### 5. Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "dilndilruksha0@gmail.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```
> Add the public key to GitHub: https://github.com/settings/keys

### 6. Test GitHub Connection
```bash
ssh -T git@github.com
```

### 7. Clone Repository
```bash
mkdir -p ~/projects && cd ~/projects
git clone git@github.com:dilrukshax/smart-irrigation-system.git
cd smart-irrigation-system
git checkout aca-o-service
```

### 8. Switch to Your Branch
```bash
cd ~/projects/smart-irrigation-system
git fetch origin
git checkout aca-o-service
```

### 9. Git Pull (Get Latest Changes)
```bash
cd ~/projects/smart-irrigation-system
git pull origin aca-o-service
```

### 10. Install Python
```bash
sudo apt install python3.12 python3.12-venv python3-pip -y
```

### 11. Create Virtual Environment
```bash
cd ~/projects/smart-irrigation-system
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

### 12. Install Dependencies
```bash
# Jupyter
pip install jupyter jupyterlab

# PyTorch (CPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Data Science
pip install numpy pandas matplotlib seaborn scikit-learn

# Additional Packages
pip install requests beautifulsoup4 kaggle openpyxl tabula-py pdfplumber

# Service Requirements
pip install -r services/optimize_service/requirements.txt
```

### 13. Install Java (for PDF extraction)
```bash
sudo apt install default-jdk -y
```

### 14. Setup Kaggle API
```bash
mkdir -p ~/.kaggle
nano ~/.kaggle/kaggle.json
# Paste: {"username":"your-username","key":"your-api-key"}
chmod 600 ~/.kaggle/kaggle.json
```

### 15. Start Jupyter Notebook
```bash
cd ~/projects/smart-irrigation-system
source ~/projects/smart-irrigation-system/venv/bin/activate
jupyter notebook --no-browser --port=8888 --ip=0.0.0.0
```

### 16. Access Jupyter (from local machine)

**Option A: SSH Tunnel (Recommended)**
```bash
ssh -L 8888:localhost:8888 azureuser@YOUR-VM-IP
```
Then open: `http://localhost:8888`

**Option B: Direct Access**
Open port 8888 in Azure NSG, then: `http://YOUR-VM-IP:8888`

---

## Quick Commands Reference

### Activate Virtual Environment
```bash
source ~/projects/smart-irrigation-system/venv/bin/activate
```

### Git Pull Latest Changes
```bash
cd ~/projects/smart-irrigation-system
git pull origin aca-o-service
```

### Git Push Changes
```bash
git add .
git commit -m "Your commit message"
git push origin aca-o-service
```

### Check Git Status
```bash
git status
```

### Run Jupyter in Background (using screen)
```bash
sudo apt install screen -y
screen -S jupyter
cd ~/projects/smart-irrigation-system/services/optimize_service/notebooks
source ~/projects/smart-irrigation-system/venv/bin/activate
jupyter notebook --no-browser --port=8888 --ip=0.0.0.0
# Detach: Ctrl+A, then D
# Reattach: screen -r jupyter
```

### Stop Jupyter
```bash
# Press Ctrl+C in the terminal running Jupyter
# Or find and kill the process:
pkill -f jupyter
```

---

## Troubleshooting

### Permission Denied (SSH)
```bash
chmod 600 ~/.ssh/id_ed25519
```

### Virtual Environment Not Found
```bash
python3.12 -m venv venv
```

### Jupyter Not Found
```bash
source ~/projects/smart-irrigation-system/venv/bin/activate
pip install jupyter
```

### Port Already in Use
```bash
# Kill existing Jupyter process
pkill -f jupyter
# Or use a different port
jupyter notebook --no-browser --port=8889 --ip=0.0.0.0
```
