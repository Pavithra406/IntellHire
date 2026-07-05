"""
Code execution engine supporting Python, Java, and C.
Runs code in a subprocess with timeout and memory limits.
"""
import subprocess
import tempfile
import os
import platform
from typing import List, Dict


TIMEOUT_SECONDS = 10
MAX_OUTPUT_CHARS = 5000


def run_python(code: str, stdin: str = "") -> Dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        fname = f.name
    try:
        result = subprocess.run(
            ["python", fname],
            input=stdin, capture_output=True, text=True,
            timeout=TIMEOUT_SECONDS, encoding="utf-8"
        )
        return {
            "stdout": result.stdout.strip()[:MAX_OUTPUT_CHARS],
            "stderr": result.stderr.strip()[:500],
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Time Limit Exceeded", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    finally:
        try: os.unlink(fname)
        except: pass


def run_java(code: str, stdin: str = "") -> Dict:
    tmpdir = tempfile.mkdtemp()
    # Extract class name from code
    import re
    match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = match.group(1) if match else "Main"
    java_file = os.path.join(tmpdir, f"{class_name}.java")

    try:
        with open(java_file, "w") as f:
            f.write(code)

        # Compile
        compile_result = subprocess.run(
            ["javac", java_file],
            capture_output=True, text=True, timeout=30,
            cwd=tmpdir
        )
        if compile_result.returncode != 0:
            return {
                "stdout": "",
                "stderr": f"Compilation Error:\n{compile_result.stderr[:500]}",
                "exit_code": 1
            }

        # Run
        run_result = subprocess.run(
            ["java", "-cp", tmpdir, class_name],
            input=stdin, capture_output=True, text=True, timeout=TIMEOUT_SECONDS,
            cwd=tmpdir
        )
        return {
            "stdout": run_result.stdout.strip()[:MAX_OUTPUT_CHARS],
            "stderr": run_result.stderr.strip()[:500],
            "exit_code": run_result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Time Limit Exceeded", "exit_code": -1}
    except FileNotFoundError:
        return {"stdout": "", "stderr": "Java not installed on server. Install JDK.", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    finally:
        import shutil
        try: shutil.rmtree(tmpdir)
        except: pass


def run_c(code: str, stdin: str = "") -> Dict:
    tmpdir = tempfile.mkdtemp()
    c_file = os.path.join(tmpdir, "solution.c")
    exe_file = os.path.join(tmpdir, "solution.exe" if platform.system() == "Windows" else "solution")

    try:
        with open(c_file, "w") as f:
            f.write(code)

        # Compile
        compiler = "gcc"
        compile_result = subprocess.run(
            [compiler, c_file, "-o", exe_file, "-lm"],
            capture_output=True, text=True, timeout=30
        )
        if compile_result.returncode != 0:
            return {
                "stdout": "",
                "stderr": f"Compilation Error:\n{compile_result.stderr[:500]}",
                "exit_code": 1
            }

        # Run
        run_result = subprocess.run(
            [exe_file],
            input=stdin, capture_output=True, text=True, timeout=TIMEOUT_SECONDS
        )
        return {
            "stdout": run_result.stdout.strip()[:MAX_OUTPUT_CHARS],
            "stderr": run_result.stderr.strip()[:500],
            "exit_code": run_result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Time Limit Exceeded", "exit_code": -1}
    except FileNotFoundError:
        return {"stdout": "", "stderr": "GCC not installed on server.", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    finally:
        import shutil
        try: shutil.rmtree(tmpdir)
        except: pass


def execute_code(code: str, language: str, stdin: str = "") -> Dict:
    lang = language.lower().strip()
    if lang == "python":
        return run_python(code, stdin)
    elif lang == "java":
        return run_java(code, stdin)
    elif lang in ["c", "c99"]:
        return run_c(code, stdin)
    else:
        return {"stdout": "", "stderr": f"Language '{language}' not supported. Use: python, java, c", "exit_code": -1}


def run_against_test_cases(code: str, language: str, test_cases: List[Dict]) -> Dict:
    """
    Run code against multiple test cases.
    test_cases: [{"input": "...", "expected_output": "...", "is_hidden": false}]
    """
    results = []
    passed = 0

    for i, tc in enumerate(test_cases):
        stdin = tc.get("input", "")
        expected = tc.get("expected_output", "").strip()
        is_hidden = tc.get("is_hidden", False)

        exec_result = execute_code(code, language, stdin)
        actual = exec_result["stdout"].strip()
        did_pass = actual == expected

        if did_pass:
            passed += 1

        results.append({
            "test_case": i + 1,
            "is_hidden": is_hidden,
            "passed": did_pass,
            "input": stdin if not is_hidden else "Hidden",
            "expected": expected if not is_hidden else "Hidden",
            "actual": actual if not is_hidden else ("Passed" if did_pass else "Failed"),
            "stderr": exec_result["stderr"] if exec_result["stderr"] else None,
            "exit_code": exec_result["exit_code"]
        })

    total = len(test_cases)
    score_ratio = passed / total if total > 0 else 0

    return {
        "passed": passed,
        "total": total,
        "score_ratio": score_ratio,
        "percentage": round(score_ratio * 100, 1),
        "results": results
    }
