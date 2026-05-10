cmake_minimum_required(VERSION 3.15)
project(Centerline)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

cmake_host_system_information(RESULT OPERATING_SYSTEM QUERY OS_NAME)

# Set Raylib source path
if (${OPERATING_SYSTEM} STREQUAL "Windows")
    set(RAYLIB_SRC "C:/raylib/raylib/src")
    message(STATUS "ON Windows")
elseif(${OPERATING_SYSTEM} STREQUAL "Linux")
    set(RAYLIB_SRC "$ENV{RAYLIB_PATH}")
    message(STATUS "$ENV{RAYLIB_PATH}")
    message(STATUS "ON Linux")
endif()

message(STATUS "RAYLIB_SRC=" ${RAYLIB_SRC})

include_directories(${RAYLIB_SRC})

add_library(raylib STATIC IMPORTED)
set_target_properties(raylib PROPERTIES
    IMPORTED_LOCATION "${RAYLIB_SRC}/libraylib.a"
)

add_executable(${PROJECT_NAME} main.cpp)

target_link_libraries(${PROJECT_NAME} raylib)

if (${OPERATING_SYSTEM} STREQUAL "Windows")
    target_link_libraries(${PROJECT_NAME} winmm gdi32 opengl32)
elseif(${OPERATING_SYSTEM} STREQUAL "Linux")
    target_link_libraries(${PROJECT_NAME} GL X11 m)
endif()
