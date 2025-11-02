# Global
## IPv4 Insight Panel - progress-wrapper
* The element `ipv4-progress-indicator` must be positioned on the `progress-track` according to the following proportionality rule:
- The position reflects the entered IP address’s value compared to the total size of the network.
For example, if the entered IP is "192.168.1.125/24", the `ipv4-progress-indicator` should be located roughly in the middle, since 127 is close to the midpoint of 256.
On the `ipv4-insight-progress-track`, there should be two colors: the color close to violet should represent the network portion and must be to the left of `ipv4-progress-indicator`, while the color close to orange represents the host portion and should be to the right of `ipv4-progress-indicator`.