# Minimal tokenizer for INFERENCE with the character ("simple") tokenizer.
# Upstream tokenizer.py pulls in jieba/pypinyin/cn2an/inflect/piper_phonemize for
# the Chinese/English/espeak tokenizers, none of which the Indic character model
# needs. Only SimpleTokenizer is real; the others are stubs so imports don't break.
import logging
from typing import Dict, List, Optional


class SimpleTokenizer:
    """Treat every character as a token, no text normalization."""

    def __init__(self, token_file: Optional[str] = None):
        self.has_tokens = False
        if token_file is None:
            return
        self.token2id: Dict[str, int] = {}
        with open(token_file, "r", encoding="utf-8") as f:
            for line in f:
                info = line.rstrip("\n").split("\t")
                token, tid = info[0], int(info[1])
                assert token not in self.token2id, token
                self.token2id[token] = tid
        self.pad_id = self.token2id["_"]
        self.vocab_size = len(self.token2id)
        self.has_tokens = True

    def texts_to_token_ids(self, texts: List[str]) -> List[List[int]]:
        return self.tokens_to_token_ids(self.texts_to_tokens(texts))

    def texts_to_tokens(self, texts: List[str]) -> List[List[str]]:
        return [list(t) for t in texts]

    def tokens_to_token_ids(self, tokens_list: List[List[str]]) -> List[List[int]]:
        assert self.has_tokens, "Please initialize Tokenizer with a tokens file."
        out = []
        for tokens in tokens_list:
            ids = []
            for t in tokens:
                if t not in self.token2id:
                    logging.debug(f"Skip OOV {t}")
                    continue
                ids.append(self.token2id[t])
            out.append(ids)
        return out


class _Unavailable:
    def __init__(self, *a, **k):
        raise NotImplementedError(
            "This build ships only the 'simple' character tokenizer. "
            "Use --tokenizer simple."
        )


class EmiliaTokenizer(_Unavailable): pass
class EspeakTokenizer(_Unavailable): pass
class LibriTTSTokenizer(_Unavailable): pass
