"""背景線：排程跑的時候不讓電腦睡（SetThreadExecutionState）。STOP 檔出現、或最多 36 小時就放開。"""
import ctypes, os, time
HERE = os.path.dirname(os.path.abspath(__file__))
ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
t0 = time.time()
while not os.path.exists(os.path.join(HERE, 'STOP')) and time.time() - t0 < 36 * 3600:
    time.sleep(60)
ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
