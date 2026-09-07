import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.animation as animation
np.set_printoptions(suppress=True)

t0 = 0
t_end = 16
dt = 0.02
t = np.arange(t0, t_end + dt, dt)

# blue train
f1 = 0.125 # Hz
A1 = 7 # m
train_blue = A1 * np.sin(2 * np.pi* f1 * t)

# Red train:
f2=0.125 # [hz]
A2=-7 # [m]
train_red=A2*np.cos(2*np.pi*f2*t)


# Animation

frame_amount=len(t)

def update_plot(num):
    # Subplot 0
    X_blue.set_data(t[0:num], train_blue[0:num])
    X_red.set_data(t[0:num], train_red[0:num])

    return X_blue, X_red,

fig = plt.figure(figsize=(16,9),dpi=120,facecolor=(0.8,0.8,0.8))
gs = gridspec.GridSpec(2,2)

ax0 = fig.add_subplot(gs[0,0],facecolor=(0.9,0.9,0.9))
ax0.set_xlim(t0,t_end)
ax0.set_ylim(-max(A1, A2)-1,max(A1,A2)+1)
ax0.grid(True)

X_blue, =ax0.plot([],[],'-b',linewidth=3,label='X_blue = '+str(A1)+'*sin(2π*'+str(f1)+'*t)')
X_red,=ax0.plot([],[],'-r',linewidth=3,label='X_red = '+str(A2)+'*cos(2π*'+str(f2)+'*t)')

ax1 = fig.add_subplot(gs[1,0],facecolor=(0.9,0.9,0.9))

ax3 = fig.add_subplot(gs[:,1],facecolor=(0.9,0.9,0.9))

ani=animation.FuncAnimation(fig, update_plot, frames = frame_amount, interval = 20, repeat = False, blit = True)

plt.show()