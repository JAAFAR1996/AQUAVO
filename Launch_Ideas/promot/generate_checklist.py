import json
import os

# Paths
base_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\Launch_Ideas\promot"
files = [
    "AQUAVO_BRAINWEAVE_WEEK1_PART1.json",
    "AQUAVO_BRAINWEAVE_WEEK1_PART2.json",
    "AQUAVO_BRAINWEAVE_WEEK1_PART3.json"
]

all_days = []
for f in files:
    path = os.path.join(base_dir, f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            if 'schedule' in data:
                all_days.extend(data['schedule'])
            elif isinstance(data, list):
                all_days.extend(data)

html_content = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✅ جدول متابعة AQUAVO - الأسبوع الأول</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; }
        .checkbox-custom { width: 22px; height: 22px; cursor: pointer; accent-color: #0ea5e9; }
        .completed { text-decoration: line-through; color: #9ca3af; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); transition: all 0.2s; }
    </style>
</head>
<body class="p-4 md:p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-slate-100">
        <div class="flex flex-col items-center mb-10">
            <h1 class="text-4xl font-black text-slate-800 mb-3 tracking-tight">جدول إنتاج ونشر <span class="text-blue-600">AQUAVO</span></h1>
            <p class="text-slate-500 font-medium">متابعة الأسبوع الأول كامل (ستوريات، ريلزات، بوستات)</p>
        </div>
        
        <div class="mb-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p class="text-slate-600 text-sm font-medium">💡 حدد المربعات عند إكمال الإنتاج والنشر. يتم حفظ التقدم تلقائياً في متصفحك.</p>
            <button onclick="resetChecklist()" class="px-5 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold shadow-sm">إعادة تصفير الكل 🔄</button>
        </div>

        <!-- Timer / Alarm Widget -->
        <div class="mb-10 bg-indigo-50 border-2 border-indigo-100 rounded-xl p-5 shadow-sm">
            <h3 class="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">⏰ موقت النشر (منبه)</h3>
            <p class="text-sm text-indigo-700 mb-4">اضبط منبه لتذكيرك بموعد النشر. سيصدر تنبيه صوتي عندما يحين الوقت.</p>
            <div class="flex flex-col md:flex-row gap-3 items-center">
                <input type="time" id="alarmTime" class="border border-indigo-200 rounded-lg p-2 flex-1 md:flex-none text-center font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-400">
                <input type="text" id="alarmLabel" placeholder="مثال: نشر ريلز يوم الثلاثاء" class="border border-indigo-200 rounded-lg p-2 flex-1 text-sm outline-none focus:ring-2 focus:ring-indigo-400 w-full">
                <button onclick="addAlarm()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md w-full md:w-auto">تفعيل المنبه 🔔</button>
                <button onclick="testSound()" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 px-4 rounded-lg transition text-sm shadow-sm border border-indigo-200 w-full md:w-auto">تجربة الصوت 🔊</button>
            </div>
            <div id="alarmsList" class="mt-4 flex flex-col gap-2"></div>
        </div>
"""

item_id_counter = 0

for day_data in all_days:
    day_name = day_data.get('day', 'يوم غير معروف')
    day_type = day_data.get('type', '')
    theme = day_data.get('theme', '')
    
    html_content += f"""
        <div class="mb-10 bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-slate-800 text-white p-5 flex flex-col md:flex-row md:items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold flex items-center gap-3">
                        📅 {day_name} 
                        <span class="px-3 py-1 bg-slate-700 text-sm rounded-full font-normal border border-slate-600 text-slate-200">{day_type}</span>
                    </h2>
                </div>
                <div class="mt-2 md:mt-0 text-slate-300 text-sm font-medium">
                    🎯 الهدف: {theme}
                </div>
            </div>
            <div class="p-6 flex flex-col gap-8">
    """
    
    # Process Stories
    if 'stories' in day_data:
        html_content += """<div><h3 class="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">📱 الستوريات (الصباح/الظهر)</h3><div class="grid gap-3">"""
        for story in day_data['stories']:
            time = story.get('time', '')
            type_str = story.get('type', 'ستوري')
            overlay = story.get('text_overlay', '')
            if not overlay and 'sticker' in story:
                overlay = story.get('sticker', '')
                
            item_id = f"item_{item_id_counter}"
            item_id_counter += 1
            html_content += f"""
                <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100 card-hover">
                    <div class="flex-1 mb-3 md:mb-0">
                        <p class="font-bold text-slate-800 text-lg" id="text_{item_id}">ستوري {time} <span class="text-sm font-normal text-slate-500 ml-2">({type_str})</span></p>
                        <p class="text-sm text-slate-600 mt-1 font-medium bg-white inline-block px-2 py-1 rounded border border-slate-200">"{overlay}"</p>
                    </div>
                    <div class="flex gap-6 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="prod_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-orange-600 select-none">أنتجت 🎬</span>
                        </label>
                        <div class="w-px h-6 bg-slate-200"></div>
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="pub_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-green-600 select-none">نُشرت 🚀</span>
                        </label>
                    </div>
                </div>
            """
        html_content += "</div></div>"
        
    # Process Reel
    if 'reel' in day_data:
        reel = day_data['reel']
        time = reel.get('time', '')
        topic = reel.get('topic', 'ريلز')
        item_id = f"item_{item_id_counter}"
        item_id_counter += 1
        html_content += f"""
            <div><h3 class="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">🎥 الريلز الأساسي</h3>
                <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100 card-hover">
                    <div class="flex-1 mb-3 md:mb-0">
                        <p class="font-bold text-slate-800 text-lg" id="text_{item_id}">ريلز {time}</p>
                        <p class="text-sm text-slate-600 mt-1 font-medium">موضوع: {topic}</p>
                    </div>
                    <div class="flex gap-6 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="prod_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-orange-600 select-none">أُنتج 🎬</span>
                        </label>
                        <div class="w-px h-6 bg-slate-200"></div>
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="pub_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-green-600 select-none">نُشر 🚀</span>
                        </label>
                    </div>
                </div>
            </div>
        """
        
    # Process Post / Carousel
    if 'carousel' in day_data or 'post' in day_data:
        key = 'carousel' if 'carousel' in day_data else 'post'
        post = day_data[key]
        time = post.get('time', '')
        title = "كاروسيل" if key == 'carousel' else "بوست"
        item_id = f"item_{item_id_counter}"
        item_id_counter += 1
        html_content += f"""
            <div><h3 class="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">🖼️ {title} الإضافي</h3>
                <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 card-hover">
                    <div class="flex-1 mb-3 md:mb-0">
                        <p class="font-bold text-slate-800 text-lg" id="text_{item_id}">{title} {time}</p>
                    </div>
                    <div class="flex gap-6 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="prod_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-orange-600 select-none">أُنتج 🎬</span>
                        </label>
                        <div class="w-px h-6 bg-slate-200"></div>
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="pub_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-green-600 select-none">نُشر 🚀</span>
                        </label>
                    </div>
                </div>
            </div>
        """
        
    # Process Story Night
    if 'story_night' in day_data:
        story = day_data['story_night']
        time = story.get('time', '')
        overlay = story.get('text_overlay', 'ستوري ختام اليوم / نداء أخير')
        item_id = f"item_{item_id_counter}"
        item_id_counter += 1
        html_content += f"""
            <div><h3 class="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-100 pb-2 flex items-center gap-2">🌙 ستوري المساء (الختام)</h3>
                <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 card-hover">
                    <div class="flex-1 mb-3 md:mb-0">
                        <p class="font-bold text-slate-800 text-lg" id="text_{item_id}">ستوري {time}</p>
                        <p class="text-sm text-slate-600 mt-1 font-medium bg-white inline-block px-2 py-1 rounded border border-slate-200">"{overlay}"</p>
                    </div>
                    <div class="flex gap-6 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="prod_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-orange-600 select-none">أُنتجت 🎬</span>
                        </label>
                        <div class="w-px h-6 bg-slate-200"></div>
                        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" class="checkbox-custom" id="pub_{item_id}" onchange="saveState('{item_id}')">
                            <span class="text-sm font-bold text-green-600 select-none">نُشرت 🚀</span>
                        </label>
                    </div>
                </div>
            </div>
        """
        
    html_content += """
            </div>
        </div>
    """

html_content += """
    </div>

    <script>
        // --- ALARM LOGIC ---
        let alarms = [];
        let alarmInterval;

        function playSound() {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 800 + (i * 100);
                    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.3);
                }, i * 400);
            }
        }

        function testSound() {
            playSound();
        }

        function addAlarm() {
            const timeInput = document.getElementById('alarmTime').value;
            const labelInput = document.getElementById('alarmLabel').value || 'تنبيه النشر!';
            
            if (!timeInput) {
                alert('الرجاء تحديد وقت المنبه!');
                return;
            }
            
            const newAlarm = {
                id: Date.now(),
                time: timeInput,
                label: labelInput,
                active: true
            };
            
            alarms.push(newAlarm);
            saveAlarms();
            renderAlarms();
            
            document.getElementById('alarmTime').value = '';
            document.getElementById('alarmLabel').value = '';
            
            startAlarmChecker();
        }

        function deleteAlarm(id) {
            alarms = alarms.filter(a => a.id !== id);
            saveAlarms();
            renderAlarms();
        }

        function renderAlarms() {
            const list = document.getElementById('alarmsList');
            list.innerHTML = '';
            
            alarms.forEach(alarm => {
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center bg-white p-3 rounded-lg border border-indigo-100 shadow-sm';
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-xl font-black text-indigo-800">${alarm.time}</span>
                        <span class="text-sm text-slate-600 font-medium">${alarm.label}</span>
                    </div>
                    <button onclick="deleteAlarm(${alarm.id})" class="text-red-500 hover:bg-red-50 p-2 rounded transition font-bold">حذف ✖</button>
                `;
                list.appendChild(item);
            });
        }

        function saveAlarms() {
            localStorage.setItem('aquavo_alarms', JSON.stringify(alarms));
        }

        function loadAlarms() {
            const saved = localStorage.getItem('aquavo_alarms');
            if (saved) {
                alarms = JSON.parse(saved);
                renderAlarms();
                if (alarms.length > 0) startAlarmChecker();
            }
        }

        function startAlarmChecker() {
            if (alarmInterval) clearInterval(alarmInterval);
            
            alarmInterval = setInterval(() => {
                const now = new Date();
                const currentHours = String(now.getHours()).padStart(2, '0');
                const currentMinutes = String(now.getMinutes()).padStart(2, '0');
                const currentTime = `${currentHours}:${currentMinutes}`;
                
                let triggered = false;
                
                alarms.forEach(alarm => {
                    if (alarm.active && alarm.time === currentTime && now.getSeconds() < 10) {
                        playSound();
                        setTimeout(() => alert(`⏰ حان الموعد: ${alarm.label}`), 500);
                        alarm.active = false; 
                        triggered = true;
                    }
                });
                
                if (triggered) {
                    alarms = alarms.filter(a => a.active);
                    saveAlarms();
                    renderAlarms();
                }
            }, 5000); 
        }

        // --- CHECKLIST LOGIC ---
        window.onload = function() {
            const inputs = document.querySelectorAll('input[type="checkbox"]');
            inputs.forEach(input => {
                const saved = localStorage.getItem(input.id);
                if (saved === 'true') {
                    input.checked = true;
                }
                updateStyle(input.id.replace('prod_', '').replace('pub_', ''));
            });
            loadAlarms(); // Load alarms on start
        };

        function saveState(itemId) {
            const prod = document.getElementById('prod_' + itemId);
            const pub = document.getElementById('pub_' + itemId);
            
            localStorage.setItem(prod.id, prod.checked);
            localStorage.setItem(pub.id, pub.checked);
            
            if (pub.checked && !prod.checked) {
                prod.checked = true;
                localStorage.setItem(prod.id, true);
            }
            
            updateStyle(itemId);
        }

        function updateStyle(itemId) {
            const prod = document.getElementById('prod_' + itemId);
            const pub = document.getElementById('pub_' + itemId);
            const text = document.getElementById('text_' + itemId);
            const parent = text.closest('.flex-col');
            
            if (prod && pub && text && parent) {
                if (pub.checked) {
                    text.classList.add('completed');
                    parent.style.opacity = '0.6';
                } else {
                    text.classList.remove('completed');
                    parent.style.opacity = '1';
                }
            }
        }

        function resetChecklist() {
            if(confirm('هل أنت متأكد من مسح جميع التقدم؟ سيتم إزالة جميع العلامات.')) {
                const inputs = document.querySelectorAll('input[type="checkbox"]');
                inputs.forEach(input => {
                    input.checked = false;
                    localStorage.setItem(input.id, false);
                });
                const texts = document.querySelectorAll('[id^="text_"]');
                texts.forEach(text => {
                    text.classList.remove('completed');
                    const parent = text.closest('.flex-col');
                    if(parent) parent.style.opacity = '1';
                });
            }
        }
    </script>
</body>
</html>
"""

out_path = os.path.join(base_dir, "AQUAVO_WEEK1_CHECKLIST.html")
with open(out_path, 'w', encoding='utf-8') as out_file:
    out_file.write(html_content)

print(f"Checklist created at: {out_path}")
