---
title: Understanding Mechanistic Interpretability
description: Notes on mechanistic interpretability - intuition, prereqs and key ideas from "A Mathematical Framework for Transformer Circuits"
date: 2025-11-15
---

Heavily inspired by [this post on prereqs](https://lelouch.dev/blog/you-are-probably-not-dumb/), I wanted to write up the prerequisites I deemed necessary for me to understand and start playing around with **mechanistic interpretability** and understanding concepts of ["A Mathematical Framework for Transformer Circuits"](https://transformer-circuits.pub/2021/framework/index.html). This blog post covers most of my working study notes on mechanistic interpretability and different intuitions I tried drawing from and is by no means exhaustive.

All of this is a way for me to try and understand why mech interp is important by way of the larger alignment work being done. To start, mechanistic interpretability is a method of understanding how models work by reverse engineering the internals. Most of this article is focusing on [this paper I'm reading](https://transformer-circuits.pub/2021/framework/index.html) and will be built upon my other [notes](http://j-csc.github.io/on-transformers) for intuitions and prereqs as well. I'll try and dive into more **up-to-date research** in subsequent posts. Most of the math in the paper will be abstracted away since it's already in the paper and I want to focus on building intuition.

## Overview

While there are multiple variants of transformer architectures, the core components remain consistent across implementations. Specific to the analysis made in the [paper](https://transformer-circuits.pub/2021/framework/index.html), the authors of the paper focused on autoregressive, decoder-only transformers similar to models we see nowadays like GPT-3 and Claude Sonnet.

> A transformer starts with a token embedding, followed by positional encoding to give the model a sense of order. It is then passed through a series of "residual blocks" containing a mix of multi-head self-attention and MLP layers. Finally, the output is projected back to the vocabulary space to generate predictions.

### QKV and Attention 
Conceptually the model makes three different representations of the input: Query ($Q$), Key ($K$), and Value ($V$).

- Query ($Q$): A vector encoding the kind of thing this token wants to find.
    - "Is this an adjective?", "What am I looking for?"
- Key ($K$): A vector encoding what this token represents (its identity, role, features)
    - "I am an adjective", "This is a noun"
- Value ($V$): A vector encoding the information/content of this token.
    - "The content of this token is 'quick'"

> Q finds K and V carries the information.

So given an input sequence of token embeddings $X = [x_1, x_2, ..., x_n]$, we compute the Q, K, and V matrices as follows:

$$
Q = XW_Q, \quad K = XW_K, \quad V = XW_V
$$

where $W_Q$, $W_K$, and $W_V$ are learned projection matrices. We then compute the attention scores using the dot product of Q and K, scaled by the square root of the dimensionality of the key vectors ($d_k$):
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

So $QK^T$ gives us a matrix of attention scores indicating how much each token should attend to every other token. The softmax function normalizes these scores into probabilities, which are then used to weight the value vectors $V$. The weighing of the value vectors tells the model how much information to pull from each token when constructing the output representation.

Geometrically, if $QK^T$ is large it means that the token represented by $Q$ is very similar to the token represented by $K$, leading to a high attention score (Yes this is what I was looking for). Conversely, if they are dissimilar, the attention score will be low.

Once we have the attention score and multiply it by $V$, we write the information into the **residual stream** - the working memory of the transformer that stores and accumulates representations as they pass through each layer. We'll explore this critical concept in detail later, but for now, think of it as a shared communication channel where each layer reads from and writes to, building up increasingly complex representations.

### MLP Layer

The MLP layer comes after the attention layer in a transformer block. In many small and medium transformers (like GPT-2 small), MLPs contribute more variance to the residual stream than attention heads. The MLP layer is a feedforward neural network that processes each token's representation independently. Although most of the paper focused on attention heads, I still found it important to understand how MLP layers worked in part of the overall transformer architecture.

The MLP layer typically consists of two linear transformations with a non-linear activation function (like ReLU or GELU) in between. In the architecture used by the paper, LayerNorm is applied first, then the MLP computation, and finally the result is added back to the residual stream:

$$
\text{r}_{l} = \text{r}_{l-1} + \text{MLP}(\text{LayerNorm}(\text{r}_{l-1}))
$$

Breaking down the MLP computation:

1. Apply the first linear transformation:
$$
H_1 = \text{LayerNorm}(\text{r}_{l-1})W_1 + b_1
$$

2. Apply the non-linear activation:
$$
H_2 = \text{Activation}(H_1)
$$

3. Apply the second linear transformation (the "write" operation):
$$
\text{MLPOutput} = H_2W_2 + b_2
$$

4. Add back to the residual stream:
$$
\text{r}_{l} = \text{r}_{l-1} + \text{MLPOutput}
$$

> It's key to understand that attention heads simply route information between tokens while MLPs help create and represent features about those tokens. For downstream mech interp ideas like **steering vectors** (a technique for directly influencing model behavior by adding vectors to the residual stream), we can add or subtract directions derived from MLP write vectors (columns of $W_2$ or combinations of them) to manipulate the residual stream in a desired direction.

Here, we're essentially first projecting the input into a higher-dimensional space (via $W_1$) where we can represent many features simultaneously. The non-linear activation will activate features and tell us "which of the x number of features this token activates". We then project it back down to the original dimensionality (via $W_2$) so we can store it back into the residual stream (working memory). The concept on $W_2$ being a "write" matrix is important since it literally pushes tokens in specific semantic directions.

### Residual Stream

Residual streams are essentially the working memory of transformers.

For each token in the input sequence, the transformer maintains a residual representation that gets updated as it passes through each layer of the model. It starts at the token embedding and positional encoding part and each layer adds its own modifications to this representation.

In a pre-LN decoder-only transformer, a typical layer looks like:

1. Read from the residual via LayerNorm and apply attention:
   $$
   x = \text{LayerNorm}(\text{r}_{l-1})
   $$
   $$
   \text{AttentionOutput} = \left(\text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V\right)W_O
   $$
   $$
   \text{r}'_{l} = \text{r}_{l-1} + \text{AttentionOutput}
   $$
   where $W_O$ is the output projection matrix that maps the attention results back to the residual stream dimension.

2. Read again via LayerNorm and apply the MLP:
   $$
   x' = \text{LayerNorm}(\text{r}'_{l})
   $$
   $$
   \text{MLPOutput} = \text{MLP}(x')
   $$
   $$
   \text{r}_{l} = \text{r}'_{l} + \text{MLPOutput}
   $$

Everything here is additive. Each layer's output is simply added to the existing residual representation, allowing the model to build up complex features and relationships over multiple layers. The residual stream stores a direction representing the accumulated features - all components read from and write into this shared space, making it a dense representation where features from different layers coexist.

> Note how **change of basis** happens and information is routed from residual stream to QKV (Query basis, Key basis, Value basis) and back to residual stream again.

It is prudent to note that the residual stream does not have a "privileged basis", meaning that the information stored within it can be represented in various ways depending on the transformations applied by the model's layers. This is the result of it being a shared communication channel for all layers, where each layer can apply its own learned transformations to read from and write to the residual stream. As each layer reads and writes to the residual stream with a linear projection, the paper introduces the concept of "virtual weights" - effective weight matrices that implicitly connect pairs of layers. Virtual weights arise because the residual stream makes all layers indirectly connected through addition, even if they do not attend to each other. By multiplying out the projection matrices, we can trace how information flows from one layer to another through the residual stream.

While this flexibility allows the model to learn complex representations, it also means that interpreting the exact meaning of the residual stream at any given point can be challenging, as it may not correspond directly to human-interpretable features.

### Multi-head Attention

Multi-head attention allows the model to attend to different parts of the input sequence simultaneously, capturing various relationships and features. Each head has its own set of learned projection matrices for Q, K, and V, allowing it to focus on different aspects of the input.
For each head $i$, we compute:
$$
Q_i = XW_{Q_i}, \quad K_i = XW_{K_i}, \quad V_i = XW_{V_i}
$$

Then, we compute the attention output for each head:
$$
\text{Attention}_i = \text{softmax}\left(\frac{Q_iK_i^T}{\sqrt{d_k}}\right)V_i
$$

Finally, we concatenate the outputs of all heads and project them back to the original dimensionality:
$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{Attention}_1, \text{Attention}_2, ..., \text{Attention}_h)W_O
$$
where $W_O$ is the output projection matrix.

For example, if we have 2 heads, one head might focus on syntactic relationships like subject-verb agreement, while another head might focus on semantic relationships like whether a topic is relevant. By having multiple heads, the model can capture a richer set of features and interactions within the input sequence. 

## Paper Takeaway
Having built intuition on the components of transformers in a slightly more mechanistic lens, we shift focus to the main takeaways from the paper. While being dense, I tried my best powering through most of it and extracted a few key ideas (definitely refer to the paper for the full details).

To start, the paper focuses on zero-layer transformers (represents bigram statistics) and one-layer transformers (attention only model - OV/QK matrices that can be understood as an ensemble of bigram and skip-trigram models) to build up intuitions. Here $W_E$ is the embedding matrix, $W_U$ is the unembedding matrix. In zero-layer transformers: 
$$
T = W_UW_EX
$$
These models simply learn to predict the next token based on bigram statistics. For example, given the input "The cat sat on the", the model would predict "mat" because "the mat" is a common bigram in the training data.

By analyzing one layer transformers, the paper shows that you can decompose attention head terms into Query-Key and Output-Value circuits. The Query-Key circuits are responsible for **determining which tokens to attend to**, while the Output-Value circuits determine how **attending to a token affects the logits**. The core finding of one layer transformers is that most of these attention heads spend a large capacity on copying behavior, meaning that they attend to previous occurrences of the same token. For example there would be skip-trigrams like: "**two** ... One **two**". This copying behavior is crucial for modeling local dependencies in the input sequence.

The paper then moves onto two-layer attention only transformers where composition between attention heads creates qualitatively new behaviors. Rather than just copying/look-up tables like the skip-trigrams in one-layer models, two-layer models can compose Query-Key circuits with Output-Value circuits across layers to express more complex functions.

This composition leads to **induction heads** - one of the paper's key findings. Induction heads learn to copy from token sequences rather than just individual tokens, and they emerge through a specific circuit composition:
- An earlier attention head's **OV circuit** writes positional offset information into the residual stream
- A later attention head's **QK circuit** reads these offsets to attend to positions based on pattern completion

For example, in the sequence "A B C ... A B C", an induction head would attend from the second "A" to the first "A" and copy over the subsequent tokens "B C". This allows the model to generalize patterns and dependencies over longer contexts - rather than looking for places to repeat single tokens, it can identify where sequences of tokens have occurred before and predict their continuation.

## Overall Thoughts
While the paper is dense and required multiple reads to fully digest, it still is foundational and a fascinating first look into the research space. The key ideas of decomposing attention heads into circuits and understanding the role of induction heads in modeling long-range dependencies are interesting and yet as I try to connect these ideas I run into the limitation of understanding the full implications of the research. IMO, I find the field struggles with "understanding v. control" - while we can identify certain heads and circuits that perform specific functions, being able to control or manipulate these functions in a predictable manner remains a challenge. This takeaway is also from a new [video](https://www.youtube.com/watch?v=XZX_CFfVgIc) I watched a few days ago on "What matters right now in mechanistic interpretability" by Neel Nanda. 

Still, it is an exciting first step learning about the building blocks (residual streams, attention-MLP decomposition, QK/OV circuits, induction heads) given the fact that there are a large number of open questions in the field compounded by the fact that there are new paradigms like reasoning models and mixture of experts that are being explored.

## What I Want to Try Next

This post is mostly about building the mental scaffolding I need to even read mech interp work without getting lost in the sauce. But I don't want this to stay purely theoretical, so here's a project I'd like to try next:

### A small web app - Goodfire-style clone
- loads a small transformer (e.g. GPT-2 small) with hooks
- runs attention and MLP forward passes on a given prompt  
- visualizes attention patterns and residual stream activations over layers
- lets me toggle simple interventions (e.g. zeroing a head, patching an activation)
- demo steering vectors

None of this is polished or anywhere close to lab level research. But I'm leaving this post up as a baseline for my intuition building starting point.