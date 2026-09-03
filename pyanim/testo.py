# Source - https://stackoverflow.com/a/69669015
# Posted by Futurologist
# Retrieved 2026-09-03, License - CC BY-SA 4.0

import numpy as np
import matplotlib.pyplot as plt

def get_vertices(L, B, I, alpha, beta):
    P = np.empty((8,3), dtype=float)
    Ind = np.array([4,5,6,7])
    #Ind = np.array([0,2,4,6])
    
    P[Ind, 0] = L/2 + I*np.tan(np.pi*alpha/180)
    P[Ind, 1] = B/2 + I*np.tan(np.pi*beta/180)
    P[Ind, 2] = I
    P[5, 0] = - P[5, 0]
    P[7, 1] = - P[7, 1]
    P[6, [0,1]] = - P[6, [0,1]]
    
    Ind = Ind - 4
    P[Ind, 0] = L/2
    P[Ind, 1] = B/2
    P[Ind, 2] = 0
    P[1, 0] = - P[1, 0]
    P[3, 1] = - P[3, 1]
    P[2, [0,1]] = - P[2, [0,1]]
    
    return P


def draw(P):
    l_x = -7
    r_x = 7
    l_y = -7
    r_y = 7
    l_z = -0.5
    r_z = 7
    fig = plt.figure()
    ax = fig.add_subplot(projection='3d')
    ax.set_xlim((l_x, r_x))
    ax.set_ylim((l_y, r_y))
    ax.set_zlim((l_z, r_z))
    Ind = np.array([[0,1], [1,2], [2,3], [3,0]]) 
    for i in Ind:        
        ax.plot(P[i, 0], P[i, 1], P[i, 2], 'r-')
    Ind = np.array([[4,5], [5,6], [6,7], [7,4]]) 
    for i in Ind:        
        ax.plot(P[i, 0], P[i, 1], P[i, 2], 'r-')
    Ind = np.array([[0,4], [1,5], [2,6], [3,7]]) 
    for i in Ind:        
        ax.plot(P[i, 0], P[i, 1], P[i, 2], 'r-')
    ax.plot(P[:,0], P[:,1], P[:,2], 'bo')
    plt.show()
    return None

L = 5
B = 5
I = 8
alpha = 0
beta = 0
ful = get_vertices(L, B, I, alpha, beta)

draw(ful)
