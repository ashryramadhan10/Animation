import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.animation as animation

t0=0 # [hrs]
t1=2 # [hrs]
dt=0.005 # [hrs]

t = np.arange(t0, t1+dt, dt)

print(t)
print(t1/dt)