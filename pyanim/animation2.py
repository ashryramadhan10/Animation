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
f1 = 1/8 # Hz
A1 = 7 # m
train_blue = A1 * np.sin(2 * np.pi * f1 * t)

# Red train:
f2 = 1/8 # [hz]
A2 = -7 # [m]
train_red = A2 * np.cos(2 * np.pi * f2 *t)

# piecewise function
y_i = 13
y_i_ani = y_i * np.ones(len(t))

GREEN_DELAY = 2.0
car_green = y_i - 2 * (t - GREEN_DELAY)**2 # delay 2 seconds t -> (t - 2), y_i as shift to 13 up and initial height

PURPLE_DELAY = 6.0
car_purple = y_i - 2 * (t - PURPLE_DELAY)

# Animation

frame_amount=len(t)

def update_plot(num):
    # Subplot 0
    X_blue.set_data(t[0:num], train_blue[0:num])
    X_red.set_data(t[0:num], train_red[0:num])

    circle_red.set_center((train_red[num], 4.5))
    circle_blue.set_center((train_blue[num], 1.5))

    if (t[num] >= GREEN_DELAY):
        Y_green.set_data(t[int(GREEN_DELAY/dt):num], car_green[int(GREEN_DELAY/dt):num]) # the concept is simple for GREEN_DELAY/dt, while t = cumsum(dt)
        circle_green.set_center((3.5, car_green[num]+0.5))
    else:
        Y_green.set_data([],[])
        circle_green.set_center((3.5, y_i_ani[num]+0.5))
        Y_green2.set_data(t[0:num], y_i_ani[0:num])

    if (t[num] >= PURPLE_DELAY):
        Y_purple.set_data(t[int(PURPLE_DELAY/dt):num], car_purple[int(PURPLE_DELAY/dt):num])
        circle_purple.set_center((-3.5, car_purple[num]+0.5))
    else:
        Y_purple2.set_data(t[0:num], y_i_ani[0:num])
        circle_purple.set_center((-3.5, y_i_ani[num]+0.5))
        Y_purple.set_data([],[])
        

    return X_blue, X_red, Y_green, Y_green2, Y_purple, Y_purple2, circle_green, circle_purple, circle_red, circle_blue,

fig = plt.figure(figsize=(16,9),dpi=120,facecolor=(0.8,0.8,0.8))
gs = gridspec.GridSpec(2,2)

ax0 = fig.add_subplot(gs[0,0],facecolor=(0.9,0.9,0.9))

X_blue,=ax0.plot([],[],'-b',linewidth=3,label='X_blue = '+str(A1)+'*sin(2π*'+str(f1)+'*t)')
X_red,=ax0.plot([],[],'-r',linewidth=3,label='X_red = '+str(A2)+'*cos(2π*'+str(f2)+'*t)')

ax0.set_xlim(t0, t_end)
ax0.set_ylim(-max(A1, A2)-1, max(A1,A2)+1)
ax0.grid(True)
ax0.set_xlabel('time [s]')
ax0.set_ylabel('X [m]')
ax0.spines['bottom'].set_position('center')
ax0.xaxis.set_label_coords(0.5,0)
ax0.legend(bbox_to_anchor=(1,1.2),fontsize='medium')

ax1 = fig.add_subplot(gs[1,0],facecolor=(0.9,0.9,0.9))

# piecewise function
Y_green,=ax1.plot([],[],'g',linewidth=3)
Y_green2,=ax1.plot([],[],'g',linewidth=3,alpha=1)

Y_purple,=ax1.plot([],[],'m',linewidth=3)
Y_purple2,=ax1.plot([],[],'m',linewidth=3,alpha=1)

plt.xlim(t0,t_end)
plt.ylim(-2,y_i+1)
plt.grid(True)
plt.xlabel('time [s]')
plt.ylabel('Y [m]')
plt.yticks(np.arange(-2, y_i+1, 1))
ax1.spines['bottom'].set_position(('data',0))
# ax1.spines['left'].set_position(('data',5))
ax1.xaxis.set_label_coords(0.5,0)

ax3 = fig.add_subplot(gs[:,1],facecolor=(0.9,0.9,0.9))

circle_green = plt.Circle((3.5, y_i+0.5), radius=0.5, color='g', fill=True)
circle_purple = plt.Circle((-3.5, y_i+0.5), radius=0.5, color='m', fill=True)

circle_red = plt.Circle((3.5, 3.5), radius=0.5, color='r', fill=True)
circle_blue = plt.Circle((-3.5, 3.5), radius=0.5, color='b', fill=True)

ax3.add_patch(circle_green)
ax3.add_patch(circle_purple)
ax3.add_patch(circle_red)
ax3.add_patch(circle_blue)
ax3.spines['left'].set_position('center')
ax3.spines['bottom'].set_position(('data',0))
plt.xlim(-max(A1, A2)-1, max(A1,A2)+1)
plt.ylim(-2,y_i+1)
plt.xticks(np.concatenate([np.arange(A2-1,0,1),np.arange(1,A1+2,1)]),size=10)
plt.yticks(np.concatenate([np.arange(-2,0,1),np.arange(1,y_i+2,1)]),size=10)
plt.grid(True)

ani=animation.FuncAnimation(fig, update_plot, frames = frame_amount, interval = 20, repeat = False, blit = True)

plt.show()