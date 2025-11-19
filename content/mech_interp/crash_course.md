---
title: Mech Interp Crash Course
description: Crash course on Mech Interp, drawn from notes on "A Mathematical Framework for Transformer Circuits"
date: 2025-11-15
---

> "The core problem of getting started on mech interp is needing to solve the curse of dimensionality." - Neel Nanda. To start, I'll try and unpack most concepts [on this lesswrong article](https://www.lesswrong.com/posts/jP9KDyMkchuv6tHwm/how-to-become-a-mechanistic-interpretability-researcher) and [A Mathematical Framework for Transformer Circuits](https://arxiv.org/abs/2302.13971).

## Mech Interp Overview

In part of larger alignment related work, mech interp is just a way of understanding how models work by reverse engineering the internals. Most of this article is focusing on [A Mathematical Framework for Transformer Circuits](https://arxiv.org/abs/2302.13971) and will be built upon my other [notes](http://j-csc.github.io/on-transformers) for intuitions and prereqs.   

## QKV and Attention Recap

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

Once we have the attention score and multiply it by $V$, we write the information into the residual stream which we'll get to later. For now you can think of the residual stream as the working memory that stores updated representations.

## MLP Layer Recap

Without jumping ahead of ourselves, the MLP layer comes after the attention layer in a transformer block and actually writes far more information into the residual stream than attention does. The MLP layer is a feedforward neural network that processes each token's representation independently.

The MLP layer typically consists of two linear transformations with a non-linear activation function (like ReLU or GELU) in between.

1. Apply the first linear transformation to the input:
$$
H_1 = XW_1 + b_1
$$
where $W_1$ is the weight matrix and $b_1$ is the bias vector.

2. Apply the non-linear activation function:
$$
H_2 = \text{Activation}(H_1)
$$

3. Apply the second linear transformation:
$$
H_3 = H_2W_2 + b_2
$$
where $W_2$ is the weight matrix and $b_2$ is the bias vector.

4. The output of the MLP layer is then added to the residual stream:
$$
\text{Residual} = \text{LayerNorm}(X + H_3)
$$

Here, we're essentially first projecting the input into a higher-dimensional space (via $W_1$) where we can represent many features simultaneously. The non-linear activation will activate features and tell us "which of the x number of features this token activates". We then project it back down to the original dimensionality (via $W_2$) so we can store it back into the residual stream (working memory).

> Its key to understand that attention heads simply route information between tokens while MLPs help create and represent features about those tokens. For downstream mech interp ideas like **steering vectors** we simply add or subtract MLP write vectors $W_2$ to manipulate the residual stream in a desired direction.

## Residual Stream Intuition

Residual streams are essentially the working memory of transformers.

For each token in the input sequence, the transformer maintains a residual representation that gets updated as it passes through each layer of the model. It starts at the token embedding and positional encoding part and each layer adds its own modifications to this representation.

At each layer we:

First read from the residual $r$ via layer normalization:
$$
\text{r}_{l} = \text{LayerNorm}(\text{r}_{l-1} + \text{LayerOutput}_l)
$$
The attention block then writes into the residual stream by attending to other tokens and pulling in relevant information. 
$$
\text{AttentionOutput} = \text{Attention}(Q, K, V)
\text{r}_{l} = \text{r}_{l-1} + \text{AttentionOutput}
$$
The MLP block then writes into the residual stream by transforming the token's representation based on learned features.
$$
\text{MLPOutput} = \text{MLP}(\text{r}_{l})
\text{r}_{l} = \text{r}_{l-1} + \text{MLPOutput}
$$

Everything here is additive. Each layer's output is simply added to the existing residual representation, allowing the model to build up complex features and relationships over multiple layers. It makes these things dense since all information such as "which token is what" is stored in the same residual stream.

> Note how **change of basis** happens and information is routed from residual stream to QKV (Query basis, Key basis, Value basis) and back to residual stream again.

## Intuition for Multi-head Attention

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

The reason is for example if we have 2 heads, one head might focus on syntactic relationships like subject-verb agreement, while another head might focus on other relationships like whether a topic is relevant. By having multiple heads, the model can capture a richer set of features and interactions within the input sequence. 
