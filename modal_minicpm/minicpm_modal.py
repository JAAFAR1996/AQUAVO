"""
MiniCPM-o 4.5 on Modal (Fixed Version)
تشغيل نموذج MiniCPM-o 4.5 على Modal للتجربة
"""

import modal

# إنشاء التطبيق
app = modal.App("minicpm-o-4.5")

# تعريف الـ Image مع كل المتطلبات
# استخدام نسخة transformers متوافقة مع النموذج
minicpm_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "torch>=2.1.0",
        "transformers==4.44.2",  # نسخة متوافقة مع MiniCPM-o
        "accelerate>=0.27.0",
        "sentencepiece",
        "Pillow",
        "decord",
        "soundfile",
        "librosa",
        "vector-quantize-pytorch",
        "vocos",
        "huggingface_hub",
        "fastapi[standard]",
        "timm",
        "torchvision",
    )
)

# Volume لتخزين النموذج (حتى لا يتم تحميله كل مرة)
model_volume = modal.Volume.from_name("minicpm-models", create_if_missing=True)
MODEL_DIR = "/models"


@app.cls(
    gpu="A10G",  # GPU قوي وبسعر معقول
    image=minicpm_image,
    volumes={MODEL_DIR: model_volume},
    timeout=600,
    scaledown_window=300,  # الاسم الجديد بدلاً من container_idle_timeout
)
class MiniCPM:
    """MiniCPM-o 4.5 Model Class"""

    @modal.enter()
    def load_model(self):
        """تحميل النموذج عند بدء الـ container"""
        import torch
        from transformers import AutoModel, AutoTokenizer
        import os

        model_path = f"{MODEL_DIR}/MiniCPM-o-4_5"

        # تحقق إذا النموذج موجود
        if not os.path.exists(f"{model_path}/config.json"):
            print("⏳ تحميل النموذج لأول مرة...")
            from huggingface_hub import snapshot_download

            snapshot_download(
                repo_id="openbmb/MiniCPM-o-4_5",
                local_dir=model_path,
            )
            model_volume.commit()
            print("✅ تم تحميل النموذج!")
        else:
            print("✅ النموذج موجود مسبقاً")

        # تحميل النموذج بالطريقة الصحيحة
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path, 
            trust_remote_code=True
        )
        
        self.model = AutoModel.from_pretrained(
            model_path,
            trust_remote_code=True,
            attn_implementation="sdpa",  # أسرع
            torch_dtype=torch.bfloat16,
            init_vision=True,
            init_audio=False,  # تعطيل الصوت لتجنب مشكلة top_p
            init_tts=False,    # تعطيل TTS لتجنب مشكلة top_p
        )
        
        self.model = self.model.eval().cuda()
        print("🚀 النموذج جاهز!")

    @modal.method()
    def chat(self, message: str, image_url: str = None) -> str:
        """
        إرسال رسالة للنموذج
        
        Args:
            message: النص المراد إرساله
            image_url: رابط صورة (اختياري)
        
        Returns:
            رد النموذج
        """
        import torch
        from PIL import Image
        import requests
        from io import BytesIO

        msgs = []

        if image_url:
            # تحميل الصورة
            response = requests.get(image_url, timeout=30)
            image = Image.open(BytesIO(response.content)).convert("RGB")
            msgs.append({"role": "user", "content": [image, message]})
        else:
            msgs.append({"role": "user", "content": message})

        with torch.no_grad():
            response = self.model.chat(
                msgs=msgs,
                tokenizer=self.tokenizer,
                sampling=True,
                temperature=0.7,
                max_new_tokens=1024,
            )

        return response

    @modal.method()
    def describe_image(self, image_url: str) -> str:
        """وصف محتوى صورة"""
        return self.chat("صف هذه الصورة بالتفصيل باللغة العربية", image_url)

    @modal.method()
    def analyze_product(self, image_url: str) -> str:
        """تحليل صورة منتج للتجارة الإلكترونية"""
        prompt = """حلل هذه الصورة للمنتج وأعطني:
1. وصف المنتج
2. الميزات الرئيسية
3. المواد المستخدمة (إن أمكن تحديدها)
4. الألوان
5. اقتراحات لتحسين العرض"""
        return self.chat(prompt, image_url)


# ===== واجهة الويب =====
@app.function(image=minicpm_image)
@modal.fastapi_endpoint(method="POST")  # الاسم الجديد
def chat_api(data: dict):
    """
    API Endpoint للتجربة
    
    POST /chat_api
    Body: {"message": "مرحبا", "image_url": "optional"}
    """
    minicpm = MiniCPM()
    response = minicpm.chat.remote(
        message=data.get("message", "مرحبا"),
        image_url=data.get("image_url"),
    )
    return {"response": response}


# ===== تشغيل محلي للتجربة =====
@app.local_entrypoint()
def main():
    """نقطة البداية للتجربة المحلية"""
    print("🚀 بدء تشغيل MiniCPM-o 4.5...")

    minicpm = MiniCPM()

    # تجربة محادثة نصية
    print("\n📝 تجربة محادثة نصية:")
    response = minicpm.chat.remote("مرحبا! عرفني عن نفسك باختصار")
    print(f"الرد: {response}")

    # تجربة مع صورة
    print("\n🖼️ تجربة مع صورة:")
    test_image = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg"
    response = minicpm.describe_image.remote(test_image)
    print(f"وصف الصورة: {response}")

    print("\n✅ انتهت التجربة!")
