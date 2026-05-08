using System;
using System.Runtime.InteropServices;

class Program {
    [DllImport("ole32.dll")] static extern int CoCreateInstance(
        ref Guid clsid, IntPtr outer, uint ctx, ref Guid iid, out IntPtr ppv);

    static Guid CLSID_Enumerator = new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E");
    static Guid IID_Enumerator   = new Guid("A95664D2-9614-4F35-A746-DE8DB63617E6");
    static Guid IID_Volume       = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");

    // Vtable delegates
    // IMMDeviceEnumerator::GetDefaultAudioEndpoint is at vtable slot 3 (after QI, AddRef, Release)
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int DGetDefaultEndpoint(IntPtr self, int dataFlow, int role, out IntPtr device);

    // IMMDevice::Activate is at vtable slot 3
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int DActivate(IntPtr self, ref Guid iid, int clsCtx, IntPtr parms, out IntPtr iface);

    // IAudioEndpointVolume: vtable slots after IUnknown (3)
    // Slot 3: RegisterControlChangeNotify
    // Slot 4: UnregisterControlChangeNotify
    // Slot 5: GetChannelCount
    // Slot 6: SetMasterVolumeLevel
    // Slot 7: SetMasterVolumeLevelScalar
    // Slot 8: GetMasterVolumeLevel
    // Slot 9: GetMasterVolumeLevelScalar
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int DSetVolScalar(IntPtr self, float level, ref Guid ctx);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int DGetVolScalar(IntPtr self, out float level);

    static IntPtr ReadVtbl(IntPtr obj, int slot) {
        IntPtr vtbl = Marshal.ReadIntPtr(obj);
        return Marshal.ReadIntPtr(vtbl, slot * IntPtr.Size);
    }

    [STAThread]
    static void Main(string[] args) {
        try {
            IntPtr pEnum;
            int hr = CoCreateInstance(ref CLSID_Enumerator, IntPtr.Zero, 1, ref IID_Enumerator, out pEnum);
            if (hr != 0) throw new Exception("CoCreateInstance failed: 0x" + hr.ToString("X"));

            // IMMDeviceEnumerator: EnumAudioEndpoints=3, GetDefaultAudioEndpoint=4
            var getEndpoint = (DGetDefaultEndpoint)Marshal.GetDelegateForFunctionPointer(
                ReadVtbl(pEnum, 4), typeof(DGetDefaultEndpoint));
            IntPtr pDevice;
            hr = getEndpoint(pEnum, 0, 1, out pDevice);
            if (hr != 0) throw new Exception("GetDefaultAudioEndpoint failed: 0x" + hr.ToString("X"));

            var activate = (DActivate)Marshal.GetDelegateForFunctionPointer(
                ReadVtbl(pDevice, 3), typeof(DActivate));
            IntPtr pVol;
            hr = activate(pDevice, ref IID_Volume, 1, IntPtr.Zero, out pVol);
            if (hr != 0) throw new Exception("Activate failed: 0x" + hr.ToString("X"));

            if (args.Length > 0 && args[0] == "get") {
                var getVol = (DGetVolScalar)Marshal.GetDelegateForFunctionPointer(
                    ReadVtbl(pVol, 9), typeof(DGetVolScalar));
                float level;
                getVol(pVol, out level);
                Console.WriteLine(level);
            } else if (args.Length > 1 && args[0] == "set") {
                var setVol = (DSetVolScalar)Marshal.GetDelegateForFunctionPointer(
                    ReadVtbl(pVol, 7), typeof(DSetVolScalar));
                float level = float.Parse(args[1], System.Globalization.CultureInfo.InvariantCulture);
                Guid empty = Guid.Empty;
                setVol(pVol, Math.Max(0f, Math.Min(1f, level)), ref empty);
            }
        } catch (Exception ex) {
            Console.Error.WriteLine(ex.Message);
            Environment.Exit(1);
        }
    }
}
