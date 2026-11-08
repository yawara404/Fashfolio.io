# Third-party notices

## ONNX Runtime SD-Turbo example

The SD-Turbo pipeline and scheduler in `frontend/workers/diffusion.worker.ts` and `frontend/utils/diffusion.ts` are adapted from the Microsoft ONNX Runtime inference example:
https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/sd-turbo

    MIT License

    Copyright (c) Microsoft Corporation.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE

## Models and tokenizer

SD-Turbo: https://huggingface.co/stabilityai/sd-turbo

ONNX weights, pinned revision `ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1`: https://huggingface.co/schmuell/sd-turbo-ort-web

CLIP tokenizer, pinned revision `342fdf2f67aded64d138ff074745fb4a5d2bba5f`: https://huggingface.co/Xenova/clip-vit-base-patch16

Model use is governed by the license linked in each model repository. Package licenses for ONNX Runtime Web and Hugging Face Tokenizers are included in their npm distributions.
