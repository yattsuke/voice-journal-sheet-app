"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { getJournalTheme, journalThemes, type JournalThemeId } from "@/lib/journal-themes";

type DraftResponse = {
  transcript: string;
  polishedTitle: string;
  polishedBody: string;
  recordedAt: string;
  themeId: JournalThemeId;
  themeLabel: string;
  sheetName: string;
};

type SaveResponse = {
  saved: boolean;
  rowNumber?: number;
  sheetName: string;
};

function buildFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `journal-${stamp}.webm`;
}

export default function HomePage() {
  const [selectedThemeId, setSelectedThemeId] = useState<JournalThemeId>("life");
  const [isRecording, setIsRecording] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("保存先を選んでから録音すると、音声から日記の下書きを作成します。");
  const [transcript, setTranscript] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [lastSavedRow, setLastSavedRow] = useState<number | null>(null);
  const [lastSavedSheet, setLastSavedSheet] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const selectedTheme = getJournalTheme(selectedThemeId);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    const currentTheme = getJournalTheme(selectedThemeId);

    setError("");
    setLastSavedRow(null);
    setLastSavedSheet("");
    setStatus(`${currentTheme.sheetName}シート向けにマイクを起動しています...`);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("このブラウザでは録音に対応していません。Android Chrome の利用をおすすめします。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined
      });

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }

        setIsRecording(false);
        setSeconds(0);
        setStatus(`${currentTheme.sheetName}シート向けに下書きを作成しています...`);

        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        await createDraft(audioBlob, currentTheme.id);
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      setStatus(`${currentTheme.label}として録音中です。話し終えたら停止してください。`);

      timerRef.current = window.setInterval(() => {
        if (!startedAtRef.current) {
          return;
        }
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    } catch (recordingError) {
      console.error(recordingError);
      setError("マイクの使用を許可できませんでした。ブラウザの権限設定を確認してください。");
      setStatus("録音を開始できませんでした。");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setStatus("録音を停止しています...");
  }

  async function createDraft(audioBlob: Blob, themeId: JournalThemeId) {
    setIsDrafting(true);
    setError("");

    try {
      const theme = getJournalTheme(themeId);
      const currentRecordedAt = new Date().toISOString();
      const formData = new FormData();
      formData.append("audio", new File([audioBlob], buildFileName(), { type: audioBlob.type }));
      formData.append("recordedAt", currentRecordedAt);
      formData.append("themeId", theme.id);

      const response = await fetch("/api/journal", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as DraftResponse | { error: string };

      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "下書きの作成に失敗しました。");
      }

      setSelectedThemeId(result.themeId);
      setTranscript(result.transcript);
      setDraftTitle(result.polishedTitle);
      setDraftBody(result.polishedBody);
      setRecordedAt(result.recordedAt);
      setStatus(`${result.sheetName}シートへ保存する下書きができました。内容を確認してください。`);
    } catch (draftError) {
      console.error(draftError);
      setError(draftError instanceof Error ? draftError.message : "下書き作成中にエラーが発生しました。");
      setStatus("下書きの作成に失敗しました。");
    } finally {
      setIsDrafting(false);
    }
  }

  async function saveDraft() {
    if (!draftTitle.trim() || !draftBody.trim()) {
      setError("タイトルと本文を入力してから保存してください。");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/journal/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recordedAt: recordedAt || new Date().toISOString(),
          transcript,
          polishedTitle: draftTitle,
          polishedBody: draftBody,
          themeId: selectedThemeId
        })
      });

      const result = (await response.json()) as SaveResponse | { error: string };

      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "保存に失敗しました。");
      }

      setLastSavedRow(result.rowNumber ?? null);
      setLastSavedSheet(result.sheetName);
      setStatus(
        result.rowNumber
          ? `${result.sheetName}シートの${result.rowNumber}行目へ保存しました。`
          : `${result.sheetName}シートへ保存しました。`
      );
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "保存中にエラーが発生しました。");
      setStatus("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  const busy = isDrafting || isSaving;
  const canSave = Boolean(transcript && draftTitle.trim() && draftBody.trim()) && !isRecording && !busy;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Voice Journal for Android</p>
        <h1>話したことを、そのまま日記に。</h1>
        <p className={styles.lead}>
          スマホで録音すると、OpenAI が文字起こしして日記の下書きを作成します。仕事、生活、その他など、保存先のテーマを選んでから Google スプレッドシートへ保存できます。
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.controls}>
          <div className={styles.themeSection}>
            <div className={styles.sectionHeader}>
              <strong>保存テーマ</strong>
              <p>録音前に選ぶと、そのテーマのシートへ保存します。下書き後に変更してから保存しても大丈夫です。</p>
            </div>

            <div className={styles.themeGrid}>
              {journalThemes.map((theme) => {
                const isActive = theme.id === selectedThemeId;

                return (
                  <button
                    key={theme.id}
                    aria-pressed={isActive}
                    className={`${styles.themeButton} ${isActive ? styles.themeButtonActive : ""}`}
                    disabled={busy || isRecording}
                    onClick={() => setSelectedThemeId(theme.id)}
                    type="button"
                  >
                    <span className={styles.themeLabel}>{theme.label}</span>
                    <span className={styles.themeDescription}>{theme.description}</span>
                    <span className={styles.themeSheet}>{theme.sheetName}シートに保存</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className={isRecording ? styles.stopButton : styles.recordButton}
            disabled={busy}
            onClick={isRecording ? stopRecording : startRecording}
            type="button"
          >
            {isRecording ? "録音を止める" : "録音を始める"}
          </button>
          <div className={styles.meta}>
            <span>{isRecording ? `録音時間 ${seconds}秒` : "待機中"}</span>
            <span>現在の保存先: {selectedTheme.sheetName}シート</span>
            <span>
              {isDrafting
                ? "文字起こしと下書き作成を実行中"
                : isSaving
                  ? `${selectedTheme.sheetName}シートへ保存中`
                  : "録音後に内容を編集して保存"}
            </span>
          </div>
        </div>

        <div className={styles.statusBox}>
          <strong>状態</strong>
          <p>{status}</p>
          {lastSavedRow ? (
            <p className={styles.success}>
              保存先: {lastSavedSheet}シート / 行番号: {lastSavedRow}
            </p>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      </section>

      <section className={styles.results}>
        <article className={`${styles.card} ${styles.editorCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2>日記の下書き</h2>
              <p className={styles.cardSubtext}>保存時は {selectedTheme.sheetName} シートへ送られます。</p>
            </div>
            <button
              className={styles.saveButton}
              disabled={!canSave}
              onClick={saveDraft}
              type="button"
            >
              保存する
            </button>
          </div>

          <label className={styles.field}>
            <span>タイトル</span>
            <input
              className={styles.input}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="例: 雨の日の帰り道"
              value={draftTitle}
            />
          </label>

          <label className={styles.field}>
            <span>本文</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="文字起こし後の本文がここに入ります。必要なら保存前に整えてください。"
              rows={12}
              value={draftBody}
            />
          </label>
        </article>

        <article className={styles.card}>
          <h2>文字起こし</h2>
          <p className={styles.bodyText}>{transcript || "録音すると、ここに文字起こし結果が表示されます。"}</p>
          {recordedAt ? <p className={styles.timestamp}>記録日時: {new Date(recordedAt).toLocaleString("ja-JP")}</p> : null}
        </article>
      </section>
    </main>
  );
}
