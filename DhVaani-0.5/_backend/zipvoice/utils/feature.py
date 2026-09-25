# Standalone Vocos mel feature extractor (no lhotse dependency).
from dataclasses import dataclass
from typing import Union
import numpy as np
import torch
import torchaudio


def _compute_num_frames(duration, frame_shift, sampling_rate):
    num_samples = round(duration * sampling_rate)
    window_hop = round(frame_shift * sampling_rate)
    return int((num_samples + window_hop // 2) // window_hop)


@dataclass
class VocosFbankConfig:
    sampling_rate: int = 24000
    n_mels: int = 100
    n_fft: int = 1024
    hop_length: int = 256


class VocosFbank:
    name = "VocosFbank"

    def __init__(self, num_channels: int = 1):
        self.config = VocosFbankConfig()
        assert num_channels in (1, 2)
        self.num_channels = num_channels
        self.fbank = torchaudio.transforms.MelSpectrogram(
            sample_rate=self.config.sampling_rate,
            n_fft=self.config.n_fft,
            hop_length=self.config.hop_length,
            n_mels=self.config.n_mels,
            center=True,
            power=1,
        )

    def _feature_fn(self, sample):
        return self.fbank(sample).clamp(min=1e-7).log()

    def feature_dim(self, sampling_rate: int) -> int:
        return self.config.n_mels

    @property
    def frame_shift(self) -> float:
        return self.config.hop_length / self.config.sampling_rate

    def extract(self, samples: Union[np.ndarray, torch.Tensor], sampling_rate: int):
        expected_sr = self.config.sampling_rate
        assert sampling_rate == expected_sr, (
            f"Mismatched sampling rate: extractor expects {expected_sr}, got {sampling_rate}"
        )
        is_numpy = False
        if not isinstance(samples, torch.Tensor):
            samples = torch.from_numpy(samples)
            is_numpy = True
        if samples.ndim == 1:
            samples = samples.unsqueeze(0)
        else:
            assert samples.ndim == 2, samples.shape
        if self.num_channels == 1 and samples.shape[0] == 2:
            samples = samples.mean(dim=0, keepdims=True)
        mel = self._feature_fn(samples)
        mel = mel.reshape(-1, mel.shape[-1]).t()  # (time, n_mels)
        num_frames = _compute_num_frames(
            samples.shape[1] / sampling_rate, self.frame_shift, sampling_rate
        )
        if mel.shape[0] > num_frames:
            mel = mel[:num_frames]
        elif mel.shape[0] < num_frames:
            mel = mel.unsqueeze(0)
            mel = torch.nn.functional.pad(
                mel, (0, 0, 0, num_frames - mel.shape[1]), mode="replicate"
            ).squeeze(0)
        return mel.cpu().numpy() if is_numpy else mel
