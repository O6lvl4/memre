package ai

import "encoding/json"

var generateCardsSchema = json.RawMessage(`{
  "type": "object",
  "required": ["cards"],
  "properties": {
    "cards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["question", "answer"],
        "properties": {
          "question": {"type": "string", "minLength": 4},
          "answer":   {"type": "string", "minLength": 1}
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}`)

var evaluateSchema = json.RawMessage(`{
  "type": "object",
  "required": ["score", "feedback"],
  "properties": {
    "score":      {"type": "string", "enum": ["good", "partial", "incorrect"]},
    "feedback":   {"type": "string", "minLength": 1},
    "suggestion": {"type": "string"}
  },
  "additionalProperties": false
}`)

var explainSchema = json.RawMessage(`{
  "type": "object",
  "required": ["explanation"],
  "properties": {
    "explanation": {"type": "string", "minLength": 1}
  },
  "additionalProperties": false
}`)

var followUpSchema = json.RawMessage(`{
  "type": "object",
  "required": ["followUpQuestion"],
  "properties": {
    "followUpQuestion": {"type": "string", "minLength": 4}
  },
  "additionalProperties": false
}`)

const sysGenerateCards = `あなたは記憶定着のための優れたフラッシュカード作成者です。
ユーザーが与えるテキストから、暗記学習に最適な質問と答えのペアを作ります。
原則:
- 1枚のカードには1つの事実だけを問う(粒度を揃える)。
- 質問は明確で具体的。「〜とは何か」「〜の役割は」「〜と〜の違い」など多様な角度。
- 答えは要点だけ簡潔に。冗長な前置きは禁止。
- ユーザーの素材に書かれていない情報は決して付け足さない。
- 出力は必ず指定されたJSONスキーマに従う。日本語で出す。`

const sysEvaluateAnswer = `あなたはやさしく的確な学習コーチです。
ユーザーの解答を、模範解答と照らし合わせて採点します。
- "good": 主旨が合っており、用語の精度も十分。
- "partial": 方向性は合うが要素が欠ける、または微妙にズレている。
- "incorrect": 誤り、または無関係。
feedbackは2-3文で、何が良かったか/不足かを具体的に示す。
suggestionには次に意識すべき短いコツを書く(任意)。
出力は必ず指定JSONに従い、日本語で答える。`

const sysExplain = `あなたは丁寧な家庭教師です。
カードの内容について、ユーザーの追加質問に対して短く分かりやすく説明します。
- 平易な言葉で、必要なら例を1つだけ添える。
- 元のカードの答えと矛盾する説明は絶対にしない。
- 200文字以内。
出力はJSONで explanation フィールドだけに本文を入れる。日本語で答える。`

const sysFollowUp = `あなたは記憶のメタ認知を促すコーチです。
直前のカードの「答え」を踏まえ、関連知識をもう一段深く問うフォローアップ質問を1つ作ります。
- 元の質問の言い換えは避ける。応用、関連、比較、原理を問う。
- 質問は1文、短く。日本語で。
出力はJSONで followUpQuestion フィールドのみ。`
