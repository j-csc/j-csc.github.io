---
title: Neural nets
description: Foundational concepts on neural nets, mostly for intuition.
date: 2025-11-08
---

## Neural Nets

Most things are layers over layers of neurons. 

## Neuron

> Each neuron is just a function that takes outputs of neurons from the previous layer and spits out an output between 0 and 1 or any range. 

It is made up of a weighted sum as in : activation(sum of weights*input activations + bias)

Input activations $a_1 ... a_n$ are just activations from the previous layer that looks like `output = activation_function(z)`. If it's the first layer then they are just raw input features $a_1 ... a_n$ === pixels / sensor readings / text embeddings etc.

Weights are dials and nobs that can adjust the activations: $$w_1a_1+w_2a_2+...+w_na_n$$

Bias is added to the weighted sum such that we only want the neuron activated when its activated to a degree > the bias. $w_1a_1+w_2a_2+...+w_na_n + bias$

These things are then squished into a normalized range. Activation ouputs are usually activated between range $[0, 1]$ or $[-1,1]$.

In the end we get:
`output = activation_function(z)`

## Gradient descent

Weights and biases are randomized initially so you need a "cost" function to tell the model what is right / wrong. Most neural nets are differentiable unless they are discrete decisions or if/then logic. The non-differentiable functions are usually replaced with relaxations like softmax / surrogate losses.

> Differentiability =/= convexity or guaranteed global optimum. Deep learning optimizations are nonconvex (Convex optimization - linear regression or SVMs guarantees a unique global minimum while non-convex can have multiple local minimas). Convex functions are usually bowl shaped and GD guarantees a global minimum.

Cost function: $C(x,y)$ The idea of gradient descent is to:
$ compute \space \Delta C $ which is the gradient
and take a small step in the $ - \Delta C$ direction.

This thing $ - \Delta C$ will allow us to nudge the weights vector $W$ to the local minimum.

Here, `∇C = [∂C/∂w₁, ∂C/∂w₂, ..., ∂C/∂wₙ, ∂C/∂b₁, ∂C/∂b₂, ...]` is how we compute the gradient. 
The magnitude of each component in the gradient vector just tells us how sensitive the cost is to that weight / bias.

## Back propagation
Its the algorithm for determining how a single training example affects all the weights and biases in the network, and how that affects the cost. A true gradient descent means doing it for all training examples. Mostly for neural nets because its not a convex optimization problem, it will converge to a local minima.

If you follow one training example on MNIST, you can see for number 2, we want 2's output neuron to be 1 and all other output neurons to be 0.
So we want the weight to be nudged such that the output neuron for 2 is activated more and all other output neurons are activated less.

**Hebian Theory**: Neurons that fire together wire together. If two neurons are activated together, the weight between them is increased.

Say last layer activation of the neuron is $a^L = sigmoid(z^L)$ where $z^L = w^L a^{L-1} + b^L$ and $a^{L-1}$ is influenced by its own $z^L$ etc. 

Our first goal is to understand how sensitive the cost function $C$ is to small changes in $w^L$: ${dC}/{dw^L}$. The change propagates as in ${dC}/{dw^L} = \frac{dC}{da^L} \cdot \frac{da^L}{dz^L} \cdot \frac{dz^L}{dw^L}$. Because changes in weight affects z which affects a which affects cost.

Here, ${dC}/{da^L}$ is how sensitive the cost is to changes in the last layer activation. This is determined by the cost function. For example, if we are using mean squared error, then ${dC}/{da^L} = 2(a^L - y)$ where y is the true label.

${da^L}/{dz^L}$ is how sensitive the activation is to changes in z. This is determined by the activation function. For sigmoid, ${da^L}/{dz^L} = a^L(1 - a^L)$.

${dz^L}/{dw^L}$ is how sensitive z is to changes in weight. This is simply the activation from the previous layer: $a^{L-1}$.

Putting it all together, we have:
${dC}/{dw^L} = \frac{dC}{da^L} \cdot \frac{da^L}{dz^L} \cdot a^{L-1}$