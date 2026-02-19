import sys
import traceback

try:
    from backend.load_xlsx import main
    main()
except Exception as e:
    with open("error_detail.txt", "w", encoding="utf-8") as f:
        f.write(str(e) + "\n\n")
        f.write(traceback.format_exc())
    print(f"Error: {e}")
    print("Detail error disimpan di error_detail.txt")
    sys.exit(1)
