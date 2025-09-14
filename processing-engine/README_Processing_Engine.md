# How to run the processing engine

create a venv with python

`python -m venv venv`

activate the venv

`./venv/Scripts/activate`


install the dependencies 

`pip install -r requirements.txt`



***Hardware***
- Macbook Pro
- Chip: M3 Pro
- OS: Windows 11
- Memory: 16 GB

***Software***
- Python Version: 3.12.6
- AnythingLLM LLM Provider: AnythingLLM NPU (For older version, this may show Qualcomm QNN)
- AnythingLLM Chat Model: Llama 3.1 8B Chat 8K

### Setup
1. Install and setup [AnythingLLM](https://anythingllm.com/).
    1. Choose AnythingLLM NPU when prompted to choose an LLM provider to target the NPU
    2. Choose a model of your choice when prompted. This sample uses Llama 3.1 8B Chat with 8K context
2. Create a workspace by clicking "+ New Workspace"
3. Generate an API key
    1. Click the settings button on the bottom of the left panel
    2. Open the "Tools" dropdown
    3. Click "Developer API"
    4. Click "Generate New API Key"
4. Open a bash shell and clone the repo
    ```
    git clone https://github.com/thatrandomfrenchdude/simple-npu-chatbot.git
    ```
5. Create and activate your virtual environment with reqs
    ```
    # 1. navigate to the cloned directory
    cd simple-npu-chatbot

    # 2. create the python virtual environment
    python -m venv llm-venv

    # 3. activate the virtual environment
    ./llm-venv/Scripts/Activate.ps1     # windows
    source \llm-venv\bin\activate       # mac/linux

    # 4. install the requirements
    pip install -r requirements.txt
    ```
6. Create your `config.yaml` file with the following variables
    ```
    api_key: "your-key-here"
    model_server_base_url: "http://localhost:3001/api/v1"
    workspace_slug: "your-slug-here"
    stream: false
    stream_timeout: 60
    ```
7. Test the model server auth to verify the API key
    ```
    python auth.py
    ```
8. Get your workspace slug using the workspaces tool
    1. Run ```python workspaces.py``` in your command line console
    2. Find your workspace and its slug from the output
    3. Add the slug to the `workspace_slug` variable in config.yaml

### Usage
You have the option to use a terminal or gradio chat interface the talk with the bot. After completing setup, run the app you choose from the command line:
```
# gradio
python src/gradio_chatbot.py
```

### Troubleshooting
***AnythingLLM NPU Runtime Missing***<br>
On a Snapdragon X Elite machine, AnythingLLM NPU should be the default LLM Provider. If you do not see it as an option in the dropdown, you downloaded the AMD64 version of AnythingLLM. Delete the app and install the ARM64 version instead.

***Model Not Downloaded***<br>
Sometimes the selected model fails to download, causing an error in the generation. To resolve, check the model in Settings -> AI Providers -> LLM in AnythingLLM. You should see "uninstall" on the model card if it is installed correctly. If you see "model requires download," choose another model, click save, switch back, then save. You should see the model download in the upper right corner of the AnythingLLM window.
